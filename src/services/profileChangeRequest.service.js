const AppError = require("../utils/AppError");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");
const { TUTOR_STATUS } = require("../constants/tutor");
const OCCUPATION_STATUS = require("../constants/occupationStatus");
const ROLES = require("../constants/role");
const { NOTIFICATION_TYPES, NOTIFICATION_AUDIENCE } = require("../constants/notification");
const { PROFILE_CHANGE_EDITABLE_FIELDS } = require("../constants/profileChangeRequest");
const tutorRepository = require("../repositories/tutor.repository");
const userRepository = require("../repositories/user.repository");
const profileChangeRequestRepository = require("../repositories/profileChangeRequest.repository");
const subjectService = require("./subject.service");
const notificationService = require("./notification.service");
const { ProfileChangeRequestMapper } = require("../mappers");

// Whitelist field được phép đổi dùng chung với luồng duyệt của admin
// (`PROFILE_CHANGE_EDITABLE_FIELDS`) — đảm bảo cả khi tạo lẫn khi duyệt đều loại
// bỏ field không còn cho phép (vd schoolName).
const EDITABLE_FIELDS = PROFILE_CHANGE_EDITABLE_FIELDS;

const DOCUMENT_FIELDS = [
  "cccdFrontImage",
  "cccdBackImage",
  "studentCardFrontImage",
  "studentCardBackImage",
  "certificateImages",
];

// Giấy tờ đơn (mỗi field 1 ảnh) — đã chứng thực rồi thì không cho sửa lại.
const SINGLE_DOCUMENT_FIELDS = [
  "cccdFrontImage",
  "cccdBackImage",
  "studentCardFrontImage",
  "studentCardBackImage",
];

// Đã có giấy tờ chứng thực thì KHÔNG được sửa lại — chỉ được BỔ SUNG phần còn thiếu.
// (Ngoại lệ duy nhất: bổ sung ảnh bằng cấp khi vừa chuyển sang "đã tốt nghiệp".)
const assertDocumentsNotLocked = (changes, tutor) => {
  for (const field of SINGLE_DOCUMENT_FIELDS) {
    const incoming = changes[field];
    if (incoming === undefined) continue;
    if (tutor[field] && incoming !== tutor[field]) {
      throw new AppError(MESSAGE.PROFILE_CHANGE_DOCUMENT_LOCKED, HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }
  }
  // Bằng cấp: đã có ≥1 ảnh thì không cho chỉnh lại.
  if (
    changes.certificateImages !== undefined &&
    Array.isArray(tutor.certificateImages) &&
    tutor.certificateImages.length >= 1
  ) {
    throw new AppError(MESSAGE.PROFILE_CHANGE_DOCUMENT_LOCKED, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }
};

// Khi yêu cầu có động tới hồ sơ chứng thực: kiểm tra ĐỦ bộ dựa trên kết quả sau khi áp
// thay đổi (gộp hồ sơ hiện tại + thay đổi). Không tự xóa thẻ sinh viên khi tốt nghiệp.
const validateDocuments = (changes, tutor, nextOccupation) => {
  const touchesDocs = DOCUMENT_FIELDS.some((f) => changes[f] !== undefined);
  if (!touchesDocs) return;

  const merged = (field) => (changes[field] !== undefined ? changes[field] : tutor[field]);

  if (!merged("cccdFrontImage") || !merged("cccdBackImage")) {
    throw new AppError(
      "Vui lòng tải đủ ảnh CCCD mặt trước và mặt sau.",
      HTTP_STATUS.UNPROCESSABLE_ENTITY
    );
  }

  if (nextOccupation === OCCUPATION_STATUS.STUDENT) {
    if (!merged("studentCardFrontImage") || !merged("studentCardBackImage")) {
      throw new AppError(
        "Vui lòng tải đủ ảnh thẻ sinh viên mặt trước và mặt sau.",
        HTTP_STATUS.UNPROCESSABLE_ENTITY
      );
    }
  } else {
    const certs = merged("certificateImages");
    if (!Array.isArray(certs) || certs.length < 1) {
      throw new AppError(
        "Vui lòng tải lên ít nhất 1 ảnh bằng cấp.",
        HTTP_STATUS.UNPROCESSABLE_ENTITY
      );
    }
  }
};

const pickEditableChanges = (body = {}) => {
  const changes = {};
  for (const key of EDITABLE_FIELDS) {
    if (body[key] !== undefined) changes[key] = body[key];
  }
  return changes;
};

// Kiểm tra danh sách môn học hợp lệ: mảng không rỗng, không trùng, đều thuộc danh mục
// đang bật trong DB (không phân biệt hoa/thường).
const normalizeSubjects = async (subjects) => {
  if (!Array.isArray(subjects) || subjects.length === 0) return null;
  const unique = [...new Set(subjects.map((s) => (typeof s === "string" ? s.trim() : s)))];
  const activeNames = await subjectService.getActiveSubjectNames();
  const activeSet = new Set(activeNames.map((n) => n.toLowerCase()));
  const allValid = unique.every((s) => activeSet.has(String(s).toLowerCase()));
  if (!allValid) return null;
  return unique;
};

const requestChange = async (userId, body = {}) => {
  const tutor = await tutorRepository.findByUserId(userId);
  if (!tutor) throw new AppError(MESSAGE.TUTOR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

  if (tutor.status !== TUTOR_STATUS.APPROVED) {
    throw new AppError(MESSAGE.PROFILE_CHANGE_TUTOR_NOT_APPROVED, HTTP_STATUS.FORBIDDEN);
  }

  const changes = pickEditableChanges(body);
  if (Object.keys(changes).length === 0) {
    throw new AppError(MESSAGE.PROFILE_CHANGE_EMPTY, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }

  // Chuẩn hóa & validate môn học (nếu gia sư đổi danh sách môn dạy)
  if (changes.subjects !== undefined) {
    const normalized = await normalizeSubjects(changes.subjects);
    if (!normalized) {
      throw new AppError(MESSAGE.PROFILE_CHANGE_INVALID_SUBJECTS, HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }
    // Chỉ cho phép BỔ SUNG môn — không được bỏ môn đã đăng ký
    const currentSubjects = tutor.subjects ?? [];
    const removed = currentSubjects.filter((s) => !normalized.includes(s));
    if (removed.length > 0) {
      throw new AppError(
        MESSAGE.PROFILE_CHANGE_SUBJECTS_REMOVE_FORBIDDEN,
        HTTP_STATUS.UNPROCESSABLE_ENTITY
      );
    }
    changes.subjects = normalized;
  }

  // Năm tốt nghiệp gắn với tình trạng nghề nghiệp:
  // - Sinh viên: không có năm tốt nghiệp → ép null
  // - Đã tốt nghiệp / giáo viên: BẮT BUỘC có năm hợp lệ (1950..nay)
  if (changes.occupationStatus !== undefined || changes.graduationYear !== undefined) {
    const nextOccupation = changes.occupationStatus ?? tutor.occupationStatus;
    if (nextOccupation === OCCUPATION_STATUS.STUDENT) {
      changes.graduationYear = null;
    } else {
      const nextYear =
        changes.graduationYear !== undefined ? changes.graduationYear : tutor.graduationYear;
      const year = Number(nextYear);
      const currentYear = new Date().getFullYear();
      if (nextYear == null || !Number.isInteger(year) || year < 1950 || year > currentYear) {
        throw new AppError(MESSAGE.PROFILE_CHANGE_INVALID_GRAD_YEAR, HTTP_STATUS.UNPROCESSABLE_ENTITY);
      }
      changes.graduationYear = year;
    }
  }

  // Hồ sơ chứng thực: không cho sửa lại giấy tờ đã có, chỉ bổ sung phần thiếu; rồi
  // validate đủ bộ theo tình trạng nghề nghiệp (dựa trên kết quả sau khi áp thay đổi).
  assertDocumentsNotLocked(changes, tutor);
  validateDocuments(changes, tutor, changes.occupationStatus ?? tutor.occupationStatus);

  const existingPending = await profileChangeRequestRepository.findPendingByTutorId(tutor._id);
  if (existingPending) {
    throw new AppError(MESSAGE.PROFILE_CHANGE_ALREADY_PENDING, HTTP_STATUS.CONFLICT);
  }

  const request = await profileChangeRequestRepository.create({
    tutorId: tutor._id,
    userId,
    changes,
  });

  // Notify tất cả admin
  const admins = await userRepository.findAllByRole(ROLES.ADMIN);
  const tutorUser = await userRepository.findById(userId);
  const tutorName = tutorUser?.fullName || "Gia sư";
  await Promise.all(
    admins.map((admin) =>
      notificationService.createNotification({
        userId: admin._id,
        type: NOTIFICATION_TYPES.PROFILE_CHANGE_PENDING,
        message: `Gia sư ${tutorName} gửi yêu cầu đổi thông tin hồ sơ, cần được duyệt.`,
        audience: NOTIFICATION_AUDIENCE.ADMIN,
      })
    )
  );

  const populated = await profileChangeRequestRepository.findById(request._id);
  return ProfileChangeRequestMapper.toDTO(populated);
};

const getMyPending = async (userId) => {
  const tutor = await tutorRepository.findByUserId(userId);
  if (!tutor) throw new AppError(MESSAGE.TUTOR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

  const pending = await profileChangeRequestRepository.findPendingByTutorId(tutor._id);
  if (!pending) return null;

  const populated = await profileChangeRequestRepository.findById(pending._id);
  return ProfileChangeRequestMapper.toDTO(populated);
};

module.exports = { requestChange, getMyPending };
