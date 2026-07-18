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

// Lấy danh sách yêu cầu huỷ đơn nhận lớp kèm thống kê theo trạng thái
const getApplicationCancellations = async (query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const status = query.status && query.status !== "all" ? query.status : null;

  const [docs, grouped] = await Promise.all([
    classApplicationRepository.findCancellationsPage({ status, page, limit }),
    classApplicationRepository.countCancellationsGrouped(),
  ]);

  const counts = {
    all: grouped.cancel_requested + grouped.cancelled,
    cancel_requested: grouped.cancel_requested,
    cancelled: grouped.cancelled,
  };
  const totalItems = status ? counts[status] ?? 0 : counts.all;

  return {
    cancellations: ClassApplicationMapper.toDTOs(docs),
    pagination: buildPagination({ page, limit, totalItems }),
    counts,
  };
};

// Duyệt yêu cầu huỷ đơn nhận lớp (mở lại lớp, trừ thống kê, thông báo gia sư)
const approveCancellation = async (applicationId) => {
  const application = await classApplicationRepository.findById(applicationId);
  if (!application) throw new AppError(MESSAGE.CLASS_APPLICATION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  if (application.status !== CLASS_APPLICATION_STATUS.CANCEL_REQUESTED) {
    throw new AppError(MESSAGE.CLASS_APPLICATION_CANCEL_NOT_REQUESTED, HTTP_STATUS.BAD_REQUEST);
  }

  const updated = await classApplicationRepository.update(applicationId, {
    status: CLASS_APPLICATION_STATUS.CANCELLED,
  });

  const tutor = application.tutorId;
  const tutorUserId = tutor.userId?._id ?? tutor.userId;
  const classItem = application.classId;

  // Gia sư rút lớp đã nhận → mở lại cho người khác nếu chưa tới giờ học, ngược lại đánh dấu hết hạn.
  // Reset cờ hoàn thành vì gia sư đã thay đổi.
  const stillUpcoming = classItem.startDate && new Date(classItem.startDate) > new Date();
  await classRepository.update(classItem._id, {
    status: stillUpcoming ? CLASS_STATUS.OPEN : CLASS_STATUS.EXPIRED,
    completedByPoster: false,
    completedByTutor: false,
    completedAt: null,
  });

  // Trừ lại thống kê đã cộng khi duyệt nhận lớp (clamp ≥ 0)
  await tutorRepository.update(tutor._id, {
    totalClassesAccepted: Math.max(0, (tutor.totalClassesAccepted || 0) - 1),
    classesAcceptedThisMonth: Math.max(0, (tutor.classesAcceptedThisMonth || 0) - 1),
  });

  await notificationService.createNotification({
    userId: tutorUserId,
    type: NOTIFICATION_TYPES.CLASS_APPLICATION_CANCEL_APPROVED,
    message: `Yêu cầu hủy lớp ${classItem.classCode} (Môn: ${classItem.subject}) của bạn đã được duyệt.`,
  });

  return ClassApplicationMapper.toDTO(updated);
};

// Từ chối yêu cầu huỷ đơn nhận lớp (giữ nguyên đơn, thông báo gia sư)
const rejectCancellation = async (applicationId, reason) => {
  const application = await classApplicationRepository.findById(applicationId);
  if (!application) throw new AppError(MESSAGE.CLASS_APPLICATION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  if (application.status !== CLASS_APPLICATION_STATUS.CANCEL_REQUESTED) {
    throw new AppError(MESSAGE.CLASS_APPLICATION_CANCEL_NOT_REQUESTED, HTTP_STATUS.BAD_REQUEST);
  }

  const updated = await classApplicationRepository.update(applicationId, {
    status: CLASS_APPLICATION_STATUS.APPROVED,
    cancellationReason: null,
  });

  const tutor = application.tutorId;
  const tutorUserId = tutor.userId?._id ?? tutor.userId;
  const classItem = application.classId;

  const reasonText = reason ? ` Lý do: ${reason}` : "";
  await notificationService.createNotification({
    userId: tutorUserId,
    type: NOTIFICATION_TYPES.CLASS_APPLICATION_CANCEL_REJECTED,
    message: `Yêu cầu hủy lớp ${classItem.classCode} (Môn: ${classItem.subject}) đã bị từ chối, bạn vẫn nhận lớp này.${reasonText}`,
  });

  return ClassApplicationMapper.toDTO(updated);
};

module.exports = {
  getApplicationCancellations,
  approveCancellation,
  rejectCancellation,
};
