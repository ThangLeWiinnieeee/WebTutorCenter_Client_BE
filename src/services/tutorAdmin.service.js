const tutorRepository = require("../repositories/tutor.repository");
const userRepository = require("../repositories/user.repository");
const classApplicationRepository = require("../repositories/class.application.repository");
const profileChangeRequestRepository = require("../repositories/profileChangeRequest.repository");
const outboxService = require("./outbox.service");
const { NOTIFICATION_TYPES } = require("../constants/notification");
const AppError = require("../utils/AppError");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");
const ROLES = require("../constants/role");
const { TUTOR_STATUS } = require("../constants/tutor");
const { TutorMapper } = require("../mappers");
const { buildPagination } = require("../utils/pagination");
const { withTransaction } = require("../utils/transaction");

// Lấy danh sách gia sư chờ duyệt (kèm ảnh giấy tờ để đối chiếu)
const getPendingTutors = async (query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const [tutors, totalItems] = await Promise.all([
    tutorRepository.findPendingPage({ page, limit }),
    tutorRepository.countByStatus(TUTOR_STATUS.PENDING),
  ]);
  return {
    // Admin cần xem ảnh CCCD/bằng cấp để đối chiếu khi duyệt hồ sơ
    tutors: await TutorMapper.toDTOList(tutors, { includeDocuments: true }),
    pagination: buildPagination({ page, limit, totalItems }),
  };
};

// Duyệt hồ sơ gia sư (nâng vai trò người dùng + gửi thông báo)
const approveTutor = async (tutorId) => {
  const tutor = await tutorRepository.findById(tutorId);
  if (!tutor) throw new AppError(MESSAGE.TUTOR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  if (tutor.status !== TUTOR_STATUS.PENDING) {
    throw new AppError(MESSAGE.TUTOR_NOT_PENDING, HTTP_STATUS.BAD_REQUEST);
  }
  const userId = tutor.userId?._id ?? tutor.userId;
  await withTransaction(async (session) => {
    const transitioned = await tutorRepository.transitionStatus(
      tutorId,
      TUTOR_STATUS.PENDING,
      { status: TUTOR_STATUS.APPROVED },
      { session },
    );
    if (!transitioned) throw new AppError(MESSAGE.TUTOR_NOT_PENDING, HTTP_STATUS.CONFLICT);
    const updatedUser = await userRepository.updateRole(userId, ROLES.TUTOR, { session });
    if (!updatedUser) throw new AppError(MESSAGE.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    await outboxService.enqueueNotification({
      dedupeKey: `tutor:${tutorId}:approved`,
      userId,
      type: NOTIFICATION_TYPES.TUTOR_APPROVED,
      message: MESSAGE.NOTIF_TUTOR_APPROVED,
    }, { session });
  });
  return await TutorMapper.toDTO(await tutorRepository.findById(tutorId), null);
};

// Từ chối hồ sơ gia sư (kèm lý do + gửi thông báo)
const rejectTutor = async (tutorId, rejectionReason) => {
  const tutor = await tutorRepository.findById(tutorId);
  if (!tutor) throw new AppError(MESSAGE.TUTOR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  if (tutor.status !== TUTOR_STATUS.PENDING) {
    throw new AppError(MESSAGE.TUTOR_NOT_PENDING, HTTP_STATUS.BAD_REQUEST);
  }
  const userId = tutor.userId?._id ?? tutor.userId;
  await withTransaction(async (session) => {
    const transitioned = await tutorRepository.transitionStatus(
      tutorId,
      TUTOR_STATUS.PENDING,
      { status: TUTOR_STATUS.REJECTED, rejectionReason },
      { session },
    );
    if (!transitioned) throw new AppError(MESSAGE.TUTOR_NOT_PENDING, HTTP_STATUS.CONFLICT);
    await outboxService.enqueueNotification({
      dedupeKey: `tutor:${tutorId}:rejected`,
      userId,
      type: NOTIFICATION_TYPES.TUTOR_REJECTED,
      message: `Hồ sơ gia sư của bạn đã bị từ chối. Lý do: ${rejectionReason}`,
    }, { session });
  });
  return await TutorMapper.toDTO(await tutorRepository.findById(tutorId), null);
};

// Tổng hợp số liệu tổng quan cho dashboard admin (gia sư, đơn, yêu cầu chờ xử lý)
const getDashboardStats = async () => {
  const [
    pendingCount,
    approvedCount,
    rejectedCount,
    pendingClassApplicationsCount,
    profileChangeCounts,
    cancellationCounts,
  ] = await Promise.all([
    tutorRepository.countByStatus(TUTOR_STATUS.PENDING),
    tutorRepository.countByStatus(TUTOR_STATUS.APPROVED),
    tutorRepository.countByStatus(TUTOR_STATUS.REJECTED),
    classApplicationRepository.countSelected(),
    profileChangeRequestRepository.countGrouped(),
    classApplicationRepository.countCancellationsGrouped(),
  ]);
  return {
    pendingCount,
    approvedCount,
    rejectedCount,
    pendingClassApplicationsCount,
    pendingProfileChangesCount: profileChangeCounts.pending,
    pendingCancellationsCount: cancellationCounts.cancel_requested,
  };
};

module.exports = {
  getPendingTutors,
  approveTutor,
  rejectTutor,
  getDashboardStats,
};
