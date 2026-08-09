const classRepository = require("../repositories/class.repository");
const classApplicationRepository = require("../repositories/class.application.repository");
const tutorRepository = require("../repositories/tutor.repository");
const outboxService = require("./outbox.service");
const { NOTIFICATION_TYPES } = require("../constants/notification");
const { CLASS_APPLICATION_STATUS } = require("../constants/classApplication");
const { CLASS_STATUS } = require("../constants/class");
const AppError = require("../utils/AppError");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");
const { ClassApplicationMapper } = require("../mappers");
const { buildPagination } = require("../utils/pagination");
const { withTransaction } = require("../utils/transaction");

// Lấy danh sách đơn nhận lớp cho admin (lọc, phân trang, thống kê theo trạng thái)
const getClassApplications = async (query = {}) => {
  const { page = 1, limit = 10 } = query;
  const status = query.status && query.status !== "all" ? query.status : null;
  // origin: "apply" (gia sư tự ứng tuyển) | "invite" (gia sư được mời). Mặc định: tất cả.
  const origin = query.origin === "apply" || query.origin === "invite" ? query.origin : null;

  const [docs, grouped] = await Promise.all([
    classApplicationRepository.findByStatusPage({ status, origin, page, limit }),
    classApplicationRepository.countAll(origin),
  ]);

  const counts = {
    all: grouped.pending + grouped.selected + grouped.approved + grouped.rejected,
    pending: grouped.pending,
    selected: grouped.selected,
    approved: grouped.approved,
    rejected: grouped.rejected,
  };
  const totalItems = status ? counts[status] ?? 0 : counts.all;

  return {
    applications: ClassApplicationMapper.toDTOs(docs),
    pagination: buildPagination({ page, limit, totalItems }),
    counts,
  };
};

// Thống kê số lượng đơn nhận lớp theo trạng thái
const getClassApplicationStats = async (query = {}) => {
  const origin = query.origin === "apply" || query.origin === "invite" ? query.origin : null;
  return await classApplicationRepository.countAll(origin);
};

// Duyệt đơn nhận lớp (ghép lớp, loại các ứng viên còn lại, thông báo các bên)
const approveClassApplication = async (applicationId) => {
  const application = await classApplicationRepository.findById(applicationId);
  if (!application) throw new AppError(MESSAGE.CLASS_APPLICATION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  // Admin chỉ duyệt gia sư đã được người đăng chọn (selected)
  if (application.status !== CLASS_APPLICATION_STATUS.SELECTED) {
    throw new AppError(MESSAGE.CLASS_APPLICATION_NOT_SELECTED_STATUS, HTTP_STATUS.BAD_REQUEST);
  }

  const tutor = application.tutorId;
  const tutorUserId = tutor.userId?._id ?? tutor.userId;
  const classItem = application.classId;
  const posterUserId = classItem.createdBy?._id ?? classItem.createdBy;

  await withTransaction(async (session) => {
    const transitioned = await classApplicationRepository.transitionStatus(
      applicationId,
      CLASS_APPLICATION_STATUS.SELECTED,
      { status: CLASS_APPLICATION_STATUS.APPROVED },
      { session },
    );
    if (!transitioned) {
      throw new AppError(MESSAGE.CLASS_APPLICATION_NOT_SELECTED_STATUS, HTTP_STATUS.CONFLICT);
    }

    const matched = await classRepository.transitionStatus(
      classItem._id,
      CLASS_STATUS.OPEN,
      { status: CLASS_STATUS.MATCHED },
      { session },
    );
    if (!matched) {
      throw new AppError(MESSAGE.CLASS_APPLICANT_CLASS_NOT_OPEN, HTTP_STATUS.CONFLICT);
    }

    const peers = await classApplicationRepository.findPeersToReject(
      classItem._id,
      applicationId,
      { session },
    );
    await classApplicationRepository.markNotSelected(peers.map((peer) => peer._id), { session });
    await tutorRepository.update(
      tutor._id,
      { $inc: { totalClassesAccepted: 1, classesAcceptedThisMonth: 1 } },
      { session },
    );

    await outboxService.enqueueNotification({
      dedupeKey: `class-application:${applicationId}:approved:tutor`,
      userId: tutorUserId,
      type: NOTIFICATION_TYPES.CLASS_APPLICATION_APPROVED,
      message: `Chúc mừng! Bạn đã được duyệt nhận lớp ${classItem.classCode} - Môn: ${classItem.subject}. Admin sẽ liên hệ sớm để xác nhận thông tin.`,
    }, { session });
    await outboxService.enqueueNotification({
      dedupeKey: `class-application:${applicationId}:approved:poster`,
      userId: posterUserId,
      type: NOTIFICATION_TYPES.CLASS_MATCHED,
      message: `Lớp ${classItem.classCode} (Môn: ${classItem.subject}) của bạn đã có gia sư nhận. Gia sư sẽ liên hệ với bạn trong thời gian sắp tới.`,
    }, { session });
    for (const peer of peers) {
      await outboxService.enqueueNotification({
        dedupeKey: `class-application:${applicationId}:not-selected:${peer._id}`,
        userId: peer.tutorId?.userId?._id ?? peer.tutorId?.userId,
        type: NOTIFICATION_TYPES.CLASS_APPLICATION_NOT_SELECTED,
        message: `Lớp ${classItem.classCode} - Môn: ${classItem.subject} đã chọn gia sư khác. Cảm ơn bạn đã ứng tuyển.`,
      }, { session });
    }
  });

  return ClassApplicationMapper.toDTO(await classApplicationRepository.findById(applicationId));
};

// Từ chối đơn nhận lớp (kèm lý do, thông báo gia sư và người đăng)
const rejectClassApplication = async (applicationId, rejectionReason) => {
  const application = await classApplicationRepository.findById(applicationId);
  if (!application) throw new AppError(MESSAGE.CLASS_APPLICATION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  // Admin chỉ từ chối gia sư đã được người đăng chọn (selected)
  if (application.status !== CLASS_APPLICATION_STATUS.SELECTED) {
    throw new AppError(MESSAGE.CLASS_APPLICATION_NOT_SELECTED_STATUS, HTTP_STATUS.BAD_REQUEST);
  }

  const tutor = application.tutorId;
  const tutorUserId = tutor.userId?._id ?? tutor.userId;
  const classItem = application.classId;
  const posterUserId = classItem.createdBy?._id ?? classItem.createdBy;

  await withTransaction(async (session) => {
    const transitioned = await classApplicationRepository.transitionStatus(
      applicationId,
      CLASS_APPLICATION_STATUS.SELECTED,
      { status: CLASS_APPLICATION_STATUS.REJECTED, rejectionReason },
      { session },
    );
    if (!transitioned) {
      throw new AppError(MESSAGE.CLASS_APPLICATION_NOT_SELECTED_STATUS, HTTP_STATUS.CONFLICT);
    }
    await outboxService.enqueueNotification({
      dedupeKey: `class-application:${applicationId}:rejected:tutor`,
      userId: tutorUserId,
      type: NOTIFICATION_TYPES.CLASS_APPLICATION_REJECTED,
      message: `Yêu cầu nhận lớp ${classItem.classCode} (Môn: ${classItem.subject}) của bạn đã bị từ chối. Lý do: ${rejectionReason}`,
    }, { session });
    await outboxService.enqueueNotification({
      dedupeKey: `class-application:${applicationId}:rejected:poster`,
      userId: posterUserId,
      type: NOTIFICATION_TYPES.CLASS_APPLICATION_REJECTED,
      message: `Gia sư bạn chọn cho lớp ${classItem.classCode} (Môn: ${classItem.subject}) đã bị admin từ chối. Vui lòng chọn gia sư khác trong danh sách ứng tuyển.`,
    }, { session });
  });

  return ClassApplicationMapper.toDTO(await classApplicationRepository.findById(applicationId));
};

module.exports = {
  getClassApplications,
  getClassApplicationStats,
  approveClassApplication,
  rejectClassApplication,
};
