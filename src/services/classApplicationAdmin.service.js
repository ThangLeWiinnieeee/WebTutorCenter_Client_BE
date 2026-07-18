const classRepository = require("../repositories/class.repository");
const classApplicationRepository = require("../repositories/class.application.repository");
const tutorRepository = require("../repositories/tutor.repository");
const notificationService = require("./notification.service");
const { NOTIFICATION_TYPES } = require("../constants/notification");
const { CLASS_APPLICATION_STATUS } = require("../constants/classApplication");
const { CLASS_STATUS } = require("../constants/class");
const AppError = require("../utils/AppError");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");
const { ClassApplicationMapper } = require("../mappers");
const { buildPagination } = require("../utils/pagination");

// Lấy danh sách đơn nhận lớp cho admin (lọc, phân trang, thống kê theo trạng thái)
const getClassApplications = async (query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
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

  const updated = await classApplicationRepository.update(applicationId, {
    status: CLASS_APPLICATION_STATUS.APPROVED,
  });

  const tutor = application.tutorId;
  const tutorUserId = tutor.userId?._id ?? tutor.userId;
  const classItem = application.classId;
  const posterUserId = classItem.createdBy?._id ?? classItem.createdBy;

  // Các gia sư ứng tuyển còn lại của lớp → "không được chọn" + báo cho họ
  const peers = await classApplicationRepository.findPeersToReject(classItem._id, applicationId);

  await Promise.all([
    // Lớp chuyển sang "đã ghép" → ẩn khỏi feed/danh sách, vẫn còn trong "bài đăng của tôi"
    classRepository.updateStatus(classItem._id, CLASS_STATUS.MATCHED),
    notificationService.createNotification({
      userId: tutorUserId,
      type: NOTIFICATION_TYPES.CLASS_APPLICATION_APPROVED,
      message: `Chúc mừng! Bạn đã được duyệt nhận lớp ${classItem.classCode} - Môn: ${classItem.subject}. Admin sẽ liên hệ sớm để xác nhận thông tin.`,
    }),
    // Báo cho người đăng rằng đã có gia sư nhận lớp
    posterUserId &&
      notificationService.createNotification({
        userId: posterUserId,
        type: NOTIFICATION_TYPES.CLASS_MATCHED,
        message: `Lớp ${classItem.classCode} (Môn: ${classItem.subject}) của bạn đã có gia sư nhận. Gia sư sẽ liên hệ với bạn trong thời gian sắp tới.`,
      }),
    tutorRepository.update(tutor._id, {
      $inc: { totalClassesAccepted: 1, classesAcceptedThisMonth: 1 },
    }),
    // Loại các ứng viên còn lại + thông báo
    classApplicationRepository.markNotSelected(peers.map((p) => p._id)),
    ...peers.map((p) =>
      notificationService.createNotification({
        userId: p.tutorId?.userId?._id ?? p.tutorId?.userId,
        type: NOTIFICATION_TYPES.CLASS_APPLICATION_NOT_SELECTED,
        message: `Lớp ${classItem.classCode} - Môn: ${classItem.subject} đã chọn gia sư khác. Cảm ơn bạn đã ứng tuyển.`,
      }),
    ),
  ]);

  return ClassApplicationMapper.toDTO(updated);
};

// Từ chối đơn nhận lớp (kèm lý do, thông báo gia sư và người đăng)
const rejectClassApplication = async (applicationId, rejectionReason) => {
  const application = await classApplicationRepository.findById(applicationId);
  if (!application) throw new AppError(MESSAGE.CLASS_APPLICATION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  // Admin chỉ từ chối gia sư đã được người đăng chọn (selected)
  if (application.status !== CLASS_APPLICATION_STATUS.SELECTED) {
    throw new AppError(MESSAGE.CLASS_APPLICATION_NOT_SELECTED_STATUS, HTTP_STATUS.BAD_REQUEST);
  }

  const updated = await classApplicationRepository.update(applicationId, {
    status: CLASS_APPLICATION_STATUS.REJECTED,
    rejectionReason,
  });

  const tutor = application.tutorId;
  const tutorUserId = tutor.userId?._id ?? tutor.userId;
  const classItem = application.classId;
  const posterUserId = classItem.createdBy?._id ?? classItem.createdBy;

  await Promise.all([
    notificationService.createNotification({
      userId: tutorUserId,
      type: NOTIFICATION_TYPES.CLASS_APPLICATION_REJECTED,
      message: `Yêu cầu nhận lớp ${classItem.classCode} (Môn: ${classItem.subject}) của bạn đã bị từ chối. Lý do: ${rejectionReason}`,
    }),
    // Báo người đăng để chọn lại gia sư khác (các ứng viên còn lại vẫn ở trạng thái chờ)
    posterUserId &&
      notificationService.createNotification({
        userId: posterUserId,
        type: NOTIFICATION_TYPES.CLASS_APPLICATION_REJECTED,
        message: `Gia sư bạn chọn cho lớp ${classItem.classCode} (Môn: ${classItem.subject}) đã bị admin từ chối. Vui lòng chọn gia sư khác trong danh sách ứng tuyển.`,
      }),
  ]);

  return ClassApplicationMapper.toDTO(updated);
};

module.exports = {
  getClassApplications,
  getClassApplicationStats,
  approveClassApplication,
  rejectClassApplication,
};
