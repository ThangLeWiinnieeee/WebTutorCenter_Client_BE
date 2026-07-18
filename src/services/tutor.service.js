const tutorRepository = require("../repositories/tutor.repository");
const userRepository = require("../repositories/user.repository");
const subjectService = require("./subject.service");
const notificationService = require("./notification.service");
const { NOTIFICATION_TYPES } = require("../constants/notification");
const AppError = require("../utils/AppError");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");
const { TUTOR_STATUS } = require("../constants/tutor");
const OCCUPATION_STATUS = require("../constants/occupationStatus");
const { TutorMapper } = require("../mappers");

// Hồ sơ chứng thực đầy đủ khi: có CCCD 2 mặt + (sinh viên: thẻ SV 2 mặt | còn lại: ≥1 bằng cấp).
// Dùng để chặn nhận lớp và kiểm tra khi gia sư bổ sung hồ sơ.
const hasCompleteDocuments = (tutor) => {
  if (!tutor) return false;
  if (!tutor.cccdFrontImage || !tutor.cccdBackImage) return false;
  if (tutor.occupationStatus === OCCUPATION_STATUS.STUDENT) {
    return Boolean(tutor.studentCardFrontImage && tutor.studentCardBackImage);
  }
  return Array.isArray(tutor.certificateImages) && tutor.certificateImages.length >= 1;
};

// Tập _id (dạng string) của top 10 gia sư uy tín hiện tại (theo điểm Bayesian).
const getTrustedTutorIdSet = async () => {
  const ids = await tutorRepository.findTrustedTutorIds(10);
  return new Set(ids.map((id) => String(id)));
};

// Gắn cờ isTrusted cho 1 DTO hoặc danh sách DTO dựa trên tập gia sư uy tín.
const markTrusted = (dtos, trustedSet) => {
  const list = Array.isArray(dtos) ? dtos : [dtos];
  for (const dto of list) {
    if (dto) dto.isTrusted = trustedSet.has(String(dto.id));
  }
  return dtos;
};

// Đăng ký hồ sơ gia sư (kiểm tra môn học, năm tốt nghiệp, tạo hồ sơ chờ duyệt)
const registerTutor = async (userId, tutorData) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError(MESSAGE.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  const existing = await tutorRepository.findByUserId(userId);
  if (existing) {
    throw new AppError(MESSAGE.TUTOR_ALREADY_REGISTERED, HTTP_STATUS.CONFLICT);
  }

  // Môn học phải thuộc danh mục đang bật (nguồn DB, không còn enum cứng)
  const subjects = Array.isArray(tutorData.subjects) ? tutorData.subjects : [];
  if (subjects.length === 0) {
    throw new AppError(MESSAGE.PROFILE_CHANGE_INVALID_SUBJECTS, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }
  const activeNames = await subjectService.getActiveSubjectNames();
  const activeSet = new Set(activeNames.map((n) => n.toLowerCase()));
  const allValid = subjects.every((s) => activeSet.has(String(s).trim().toLowerCase()));
  if (!allValid) {
    throw new AppError(MESSAGE.PROFILE_CHANGE_INVALID_SUBJECTS, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }

  // Năm tốt nghiệp gắn với tình trạng nghề nghiệp:
  // - Sinh viên: không có năm tốt nghiệp → ép null
  // - Đã tốt nghiệp / giáo viên: BẮT BUỘC có năm hợp lệ (1950..nay)
  if (tutorData.occupationStatus === OCCUPATION_STATUS.STUDENT) {
    tutorData.graduationYear = null;
    // Sinh viên: chỉ giữ thẻ sinh viên, bỏ bằng cấp
    tutorData.certificateImages = [];
  } else {
    const year = Number(tutorData.graduationYear);
    const currentYear = new Date().getFullYear();
    if (
      tutorData.graduationYear == null ||
      !Number.isInteger(year) ||
      year < 1950 ||
      year > currentYear
    ) {
      throw new AppError(MESSAGE.PROFILE_CHANGE_INVALID_GRAD_YEAR, HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }
    tutorData.graduationYear = year;
    // Đã tốt nghiệp / giáo viên: chỉ giữ bằng cấp, bỏ thẻ sinh viên
    tutorData.studentCardFrontImage = null;
    tutorData.studentCardBackImage = null;
  }

  const tutor = await tutorRepository.create({ userId, ...tutorData });

  await notificationService.createNotification({
    userId,
    type: NOTIFICATION_TYPES.TUTOR_PENDING,
    message: MESSAGE.NOTIF_TUTOR_PENDING,
  });

  // Chủ hồ sơ được xem lại ảnh giấy tờ của chính mình
  return await TutorMapper.toDTO(tutor, user, null, { includeDocuments: true });
};

// Lấy hồ sơ gia sư của người dùng hiện tại (kèm cờ uy tín)
const getTutorProfile = async (userId) => {
  const tutor = await tutorRepository.findByUserId(userId);
  if (!tutor) {
    return null;
  }

  const user = await userRepository.findById(userId);

  // Chủ hồ sơ được xem lại ảnh giấy tờ của chính mình
  const dto = await TutorMapper.toDTO(tutor, user, null, { includeDocuments: true });
  return markTrusted(dto, await getTrustedTutorIdSet());
};

// Lấy danh sách tất cả gia sư đã approved (có phân trang, sắp xếp theo totalClassesAccepted)
const getActiveTutors = async (page = 1, limit = 20) => {
  const result = await tutorRepository.findAllApproved(page, limit);
  const dtoList = await TutorMapper.toDTOList(result.tutors);
  markTrusted(dtoList, await getTrustedTutorIdSet());
  return {
    tutors: dtoList,
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
};

// Lấy top 10 gia sư nổi bật (sắp xếp theo tổng số lần nhận lớp)
const getTopTutors = async (limit = 10) => {
  const tutors = await tutorRepository.findTopTutors(limit);
  const dtoList = await TutorMapper.toDTOList(tutors);
  return markTrusted(dtoList, await getTrustedTutorIdSet());
};

// Lấy top 10 gia sư tháng hiện tại (sắp xếp theo classesAcceptedThisMonth)
const getTopTutorsThisMonth = async (limit = 10) => {
  const tutors = await tutorRepository.findTopTutorsThisMonth(limit);
  const dtoList = await TutorMapper.toDTOList(tutors);
  return markTrusted(dtoList, await getTrustedTutorIdSet());
};

// Lấy gia sư mới được approved (trong N ngày gần đây)
const getNewTutors = async (days = 7, limit = 10) => {
  const tutors = await tutorRepository.findNewTutors(days, limit);
  const dtoList = await TutorMapper.toDTOList(tutors);
  return markTrusted(dtoList, await getTrustedTutorIdSet());
};

// Tìm kiếm & lọc gia sư
const searchActiveTutors = async (filters = {}, page = 1, limit = 20) => {
  const result = await tutorRepository.searchTutors(filters, page, limit);
  const dtoList = await TutorMapper.toDTOList(result.tutors);
  markTrusted(dtoList, await getTrustedTutorIdSet());
  return {
    tutors: dtoList,
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
};

// Lấy chi tiết một gia sư (public endpoint)
const getTutorById = async (tutorId) => {
  const tutor = await tutorRepository.findById(tutorId);
  if (!tutor) {
    throw new AppError(MESSAGE.TUTOR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  if (tutor.status !== TUTOR_STATUS.APPROVED) {
    throw new AppError(MESSAGE.TUTOR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  const dto = await TutorMapper.toDTO(tutor, null);
  markTrusted(dto, await getTrustedTutorIdSet());
  // Ẩn thông tin liên hệ ở trang công khai /tutors/:id — SĐT/email chỉ được chia sẻ
  // giữa người đăng và gia sư sau khi gia sư nhận lớp (tránh bị gọi làm phiền).
  delete dto.phone;
  delete dto.email;
  return dto;
};

module.exports = {
  hasCompleteDocuments,
  registerTutor,
  getTutorProfile,
  getActiveTutors,
  getTopTutors,
  getTopTutorsThisMonth,
  getNewTutors,
  searchActiveTutors,
  getTutorById,
};
