const tutorRepository = require("../repositories/tutor.repository");
const profileChangeRequestRepository = require("../repositories/profileChangeRequest.repository");
const outboxService = require("./outbox.service");
const { NOTIFICATION_TYPES } = require("../constants/notification");
const {
  PROFILE_CHANGE_STATUS,
  PROFILE_CHANGE_EDITABLE_FIELDS,
} = require("../constants/profileChangeRequest");
const AppError = require("../utils/AppError");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");
const OCCUPATION_STATUS = require("../constants/occupationStatus");
const { ProfileChangeRequestMapper } = require("../mappers");
const { buildPagination } = require("../utils/pagination");
const { withTransaction } = require("../utils/transaction");

// Lấy danh sách yêu cầu đổi hồ sơ kèm thống kê theo trạng thái
const getProfileChangeRequests = async (query = {}) => {
  const { page = 1, limit = 10 } = query;
  const status = query.status && query.status !== "all" ? query.status : null;

  const [docs, grouped] = await Promise.all([
    profileChangeRequestRepository.findPage({ status, page, limit }),
    profileChangeRequestRepository.countGrouped(),
  ]);

  const counts = {
    all: grouped.pending + grouped.approved + grouped.rejected,
    pending: grouped.pending,
    approved: grouped.approved,
    rejected: grouped.rejected,
  };
  const totalItems = status ? counts[status] ?? 0 : counts.all;

  return {
    requests: await ProfileChangeRequestMapper.toDTOList(docs),
    pagination: buildPagination({ page, limit, totalItems }),
    counts,
  };
};

// Duyệt yêu cầu đổi hồ sơ (áp các thay đổi trong whitelist + thông báo gia sư)
const approveProfileChange = async (requestId, adminUserId) => {
  const request = await profileChangeRequestRepository.findById(requestId);
  if (!request) throw new AppError(MESSAGE.PROFILE_CHANGE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  if (request.status !== PROFILE_CHANGE_STATUS.PENDING) {
    throw new AppError(MESSAGE.PROFILE_CHANGE_NOT_PENDING, HTTP_STATUS.BAD_REQUEST);
  }

  const tutorId = request.tutorId?._id ?? request.tutorId;
  // Chỉ áp các field còn nằm trong whitelist. Yêu cầu cũ có thể chứa field không
  // còn cho phép đổi (vd schoolName): loại bỏ khi duyệt để không lỡ áp vào hồ sơ.
  // Không xóa dữ liệu gốc trong `request.changes` — chỉ không áp field đó.
  const appliedChanges = {};
  for (const field of PROFILE_CHANGE_EDITABLE_FIELDS) {
    if (request.changes[field] !== undefined) appliedChanges[field] = request.changes[field];
  }
  const tutorUserId = request.userId?._id ?? request.userId;
  await withTransaction(async (session) => {
    const transitioned = await profileChangeRequestRepository.transitionStatus(
      requestId,
      PROFILE_CHANGE_STATUS.PENDING,
      { status: PROFILE_CHANGE_STATUS.APPROVED, reviewedBy: adminUserId, reviewedAt: new Date() },
      { session },
    );
    if (!transitioned) {
      throw new AppError(MESSAGE.PROFILE_CHANGE_NOT_PENDING, HTTP_STATUS.CONFLICT);
    }

    const updatedTutor = await tutorRepository.update(tutorId, appliedChanges, { session });
    if (!updatedTutor) throw new AppError(MESSAGE.TUTOR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const nextOccupation = request.changes.occupationStatus;
    const becameNonStudent = nextOccupation && nextOccupation !== OCCUPATION_STATUS.STUDENT;
    const certs = updatedTutor.certificateImages;
    const needsCertificate = becameNonStudent && (!Array.isArray(certs) || certs.length < 1);
    const approvalMessage = needsCertificate
      ? "Yêu cầu đổi hồ sơ đã được duyệt. Bạn đã chuyển sang trạng thái đã tốt nghiệp — vui lòng cập nhật ảnh bằng cấp trong mục Hồ sơ chứng thực để tiếp tục nhận lớp."
      : "Yêu cầu đổi thông tin hồ sơ của bạn đã được duyệt và cập nhật.";

    await outboxService.enqueueNotification({
      dedupeKey: `profile-change:${requestId}:approved`,
      userId: tutorUserId,
      type: NOTIFICATION_TYPES.PROFILE_CHANGE_APPROVED,
      message: approvalMessage,
    }, { session });
  });

  return ProfileChangeRequestMapper.toDTO(await profileChangeRequestRepository.findById(requestId));
};

// Từ chối yêu cầu đổi hồ sơ (kèm lý do + thông báo gia sư)
const rejectProfileChange = async (requestId, rejectionReason, adminUserId) => {
  const request = await profileChangeRequestRepository.findById(requestId);
  if (!request) throw new AppError(MESSAGE.PROFILE_CHANGE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  if (request.status !== PROFILE_CHANGE_STATUS.PENDING) {
    throw new AppError(MESSAGE.PROFILE_CHANGE_NOT_PENDING, HTTP_STATUS.BAD_REQUEST);
  }

  const tutorUserId = request.userId?._id ?? request.userId;
  await withTransaction(async (session) => {
    const transitioned = await profileChangeRequestRepository.transitionStatus(
      requestId,
      PROFILE_CHANGE_STATUS.PENDING,
      {
        status: PROFILE_CHANGE_STATUS.REJECTED,
        rejectionReason,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
      },
      { session },
    );
    if (!transitioned) {
      throw new AppError(MESSAGE.PROFILE_CHANGE_NOT_PENDING, HTTP_STATUS.CONFLICT);
    }
    await outboxService.enqueueNotification({
      dedupeKey: `profile-change:${requestId}:rejected`,
      userId: tutorUserId,
      type: NOTIFICATION_TYPES.PROFILE_CHANGE_REJECTED,
      message: `Yêu cầu đổi thông tin hồ sơ của bạn đã bị từ chối. Lý do: ${rejectionReason}`,
    }, { session });
  });

  return ProfileChangeRequestMapper.toDTO(await profileChangeRequestRepository.findById(requestId));
};

module.exports = {
  getProfileChangeRequests,
  approveProfileChange,
  rejectProfileChange,
};
