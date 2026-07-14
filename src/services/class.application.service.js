const AppError = require("../utils/AppError");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");
const { TUTOR_STATUS, SUBJECT_AFFINITY } = require("../constants/tutor");
const ROLES = require("../constants/role");
const { NOTIFICATION_TYPES, NOTIFICATION_AUDIENCE } = require("../constants/notification");
const { CLASS_APPLICATION_STATUS, CLASS_APPLICATION_ORIGIN } = require("../constants/classApplication");
const { CLASS_STATUS } = require("../constants/class");
const classRepository = require("../repositories/class.repository");
const classApplicationRepository = require("../repositories/class.application.repository");
const tutorRepository = require("../repositories/tutor.repository");
const userRepository = require("../repositories/user.repository");
const tutorService = require("./tutor.service");
const notificationService = require("./notification.service");
const { ClassApplicationMapper } = require("../mappers");
const { buildPagination } = require("../utils/pagination");

const applyForClass = async (userId, classId) => {
  const classItem = await classRepository.findById(classId);
  if (!classItem) throw new AppError(MESSAGE.CLASS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

  // Lớp đã có gia sư nhận hoặc đã hết hạn thì không cho nhận nữa
  if (classItem.status && classItem.status !== CLASS_STATUS.OPEN) {
    throw new AppError(MESSAGE.CLASS_APPLICATION_CLASS_CLOSED, HTTP_STATUS.CONFLICT);
  }

  // Người đăng đã chọn gia sư (đơn selected) hoặc lớp đang được xử lý (approved/cancel_requested)
  // → lớp đã bị ẩn khỏi danh sách công khai. Chặn gia sư khác nhận lớp qua URL/API trực tiếp,
  // đồng bộ với tiêu chí ẩn danh sách (LOCK_STATUSES). Lưu ý: status lớp vẫn "open" tới khi admin duyệt.
  const lockingApplication = await classApplicationRepository.findLockingByClassId(classId);
  if (lockingApplication) {
    throw new AppError(MESSAGE.CLASS_APPLICATION_CLASS_TAKEN, HTTP_STATUS.CONFLICT);
  }

  // Không cho phép nhận lớp do chính mình đăng
  if (classItem.createdBy?.toString() === String(userId)) {
    throw new AppError(MESSAGE.CLASS_APPLICATION_OWN_CLASS, HTTP_STATUS.FORBIDDEN);
  }

  const tutor = await tutorRepository.findByUserId(userId);
  if (!tutor) throw new AppError(MESSAGE.TUTOR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

  if (tutor.status !== TUTOR_STATUS.APPROVED) {
    throw new AppError(MESSAGE.TUTOR_NOT_APPROVED, HTTP_STATUS.FORBIDDEN);
  }

  // Bắt buộc có hồ sơ chứng thực đầy đủ (CCCD + thẻ sinh viên/bằng cấp) trước khi nhận lớp
  if (!tutorService.hasCompleteDocuments(tutor)) {
    throw new AppError(MESSAGE.CLASS_APPLICATION_DOCS_REQUIRED, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }

  if (!tutor.subjects.includes(classItem.subject)) {
    throw new AppError(
      `Bạn không thể nhận lớp này vì bạn không đăng ký dạy môn ${classItem.subject}`,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    );
  }

  const existing = await classApplicationRepository.findByClassAndTutor(classId, tutor._id);
  if (existing) {
    throw new AppError(MESSAGE.CLASS_APPLICATION_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
  }

  const application = await classApplicationRepository.create({
    classId,
    tutorId: tutor._id,
    status: CLASS_APPLICATION_STATUS.PENDING,
  });

  // Ứng tuyển = tín hiệu quan tâm mạnh nhất → cộng điểm affinity để feed đẩy môn này lên đầu.
  // Best-effort: không để việc ghi tín hiệu làm hỏng luồng nhận lớp nếu thất bại.
  tutorRepository
    .incrementSubjectAffinity(userId, classItem.subject, SUBJECT_AFFINITY.WEIGHT.APPLY)
    .catch(() => {});

  // Luồng mới: đơn ứng tuyển gửi tới NGƯỜI ĐĂNG (để họ chọn gia sư), không gửi thẳng admin.
  const tutorUser = await userRepository.findById(userId);
  const tutorName = tutorUser?.fullName || "Gia sư";
  const posterUserId = classItem.createdBy;
  if (posterUserId) {
    await notificationService.createNotification({
      userId: posterUserId,
      type: NOTIFICATION_TYPES.CLASS_APPLICATION_PENDING,
      message: `Gia sư ${tutorName} vừa ứng tuyển lớp ${classItem.classCode} - Môn: ${classItem.subject}. Vào "Bài đăng của tôi" để chọn gia sư.`,
    });
  }

  return ClassApplicationMapper.toDTO(application);
};

// Người đăng xem danh sách gia sư ứng tuyển bài đăng của mình (sắp theo số lớp đã dạy giảm dần).
const getApplicantsForPoster = async (userId, classId) => {
  const classItem = await classRepository.findById(classId);
  if (!classItem) throw new AppError(MESSAGE.CLASS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

  if (String(classItem.createdBy) !== String(userId)) {
    throw new AppError(MESSAGE.CLASS_APPLICANT_NOT_OWNER, HTTP_STATUS.FORBIDDEN);
  }

  const docs = await classApplicationRepository.findApplicantsByClassId(classId);
  return {
    classItem: {
      id: classItem._id,
      classCode: classItem.classCode,
      subject: classItem.subject,
      status: classItem.status || "open",
    },
    applicants: ClassApplicationMapper.toApplicantDTOs(docs),
  };
};

// Người đăng chọn 1 gia sư từ danh sách ứng tuyển → chuyển sang SELECTED, gửi admin duyệt.
const selectApplicant = async (userId, classId, applicationId) => {
  const classItem = await classRepository.findById(classId);
  if (!classItem) throw new AppError(MESSAGE.CLASS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

  if (String(classItem.createdBy) !== String(userId)) {
    throw new AppError(MESSAGE.CLASS_APPLICANT_NOT_OWNER, HTTP_STATUS.FORBIDDEN);
  }

  if (classItem.status && classItem.status !== CLASS_STATUS.OPEN) {
    throw new AppError(MESSAGE.CLASS_APPLICANT_CLASS_NOT_OPEN, HTTP_STATUS.CONFLICT);
  }

  const application = await classApplicationRepository.findById(applicationId);
  const appClassId = application?.classId?._id ?? application?.classId;
  if (!application || String(appClassId) !== String(classId)) {
    throw new AppError(MESSAGE.CLASS_APPLICATION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  if (application.status !== CLASS_APPLICATION_STATUS.PENDING) {
    throw new AppError(MESSAGE.CLASS_APPLICANT_NOT_PENDING, HTTP_STATUS.BAD_REQUEST);
  }

  // Nếu trước đó đã chọn gia sư khác (selected) → đưa họ về lại pending để chọn lại linh hoạt
  await classApplicationRepository.resetOtherSelectedToPending(classId, applicationId);
  const updated = await classApplicationRepository.update(applicationId, {
    status: CLASS_APPLICATION_STATUS.SELECTED,
  });

  const tutor = application.tutorId;
  const tutorUserId = tutor.userId?._id ?? tutor.userId;
  const tutorName = tutor.userId?.fullName || "Gia sư";

  await Promise.all([
    notificationService.createNotification({
      userId: tutorUserId,
      type: NOTIFICATION_TYPES.CLASS_APPLICATION_SELECTED,
      message: `Bạn đã được người đăng chọn cho lớp ${classItem.classCode} - Môn: ${classItem.subject}. Đang chờ admin duyệt.`,
    }),
    notifyAdmins(
      NOTIFICATION_TYPES.CLASS_APPLICATION_SELECTED,
      `Người đăng đã chọn gia sư ${tutorName} cho lớp ${classItem.classCode} - Môn: ${classItem.subject}. Vui lòng duyệt lớp.`,
    ),
  ]);

  return ClassApplicationMapper.toDTO(updated);
};

const getMyApplications = async (userId, query = {}) => {
  const tutor = await tutorRepository.findByUserId(userId);
  if (!tutor) throw new AppError(MESSAGE.TUTOR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const status = query.status && query.status !== "all" ? query.status : null;

  const [docs, grouped] = await Promise.all([
    classApplicationRepository.findByTutorIdPage(tutor._id, { status, page, limit }),
    classApplicationRepository.countByTutorIdGrouped(tutor._id),
  ]);

  const counts = {
    all:
      grouped.pending +
      grouped.selected +
      grouped.approved +
      grouped.rejected +
      grouped.not_selected +
      grouped.cancel_requested +
      grouped.cancelled,
    pending: grouped.pending,
    selected: grouped.selected,
    approved: grouped.approved,
    rejected: grouped.rejected,
    not_selected: grouped.not_selected,
    cancel_requested: grouped.cancel_requested,
    cancelled: grouped.cancelled,
  };
  const totalItems = status ? counts[status] ?? 0 : counts.all;

  return {
    applications: ClassApplicationMapper.toMineDTOs(docs),
    pagination: buildPagination({ page, limit, totalItems }),
    counts,
  };
};

const notifyAdmins = async (type, message) => {
  const admins = await userRepository.findAllByRole(ROLES.ADMIN);
  await Promise.all(
    admins.map((admin) =>
      notificationService.createNotification({
        userId: admin._id,
        type,
        message,
        audience: NOTIFICATION_AUDIENCE.ADMIN,
      })
    )
  );
};

// Gia sư rút/hủy đơn nhận lớp.
// - Đơn pending: hủy ngay (cancelled).
// - Đơn approved: tạo yêu cầu hủy (cancel_requested) chờ admin duyệt.
const cancelApplication = async (userId, applicationId, reason) => {
  const application = await classApplicationRepository.findById(applicationId);
  if (!application) throw new AppError(MESSAGE.CLASS_APPLICATION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

  // Đơn phải thuộc về gia sư đang đăng nhập
  const tutorUserId = application.tutorId?.userId?._id ?? application.tutorId?.userId;
  if (String(tutorUserId) !== String(userId)) {
    throw new AppError(MESSAGE.CLASS_APPLICATION_NOT_FOUND, HTTP_STATUS.FORBIDDEN);
  }

  const classItem = application.classId;

  if (application.status === CLASS_APPLICATION_STATUS.PENDING) {
    const updated = await classApplicationRepository.update(applicationId, {
      status: CLASS_APPLICATION_STATUS.CANCELLED,
      cancellationReason: reason,
    });
    await notifyAdmins(
      NOTIFICATION_TYPES.CLASS_APPLICATION_CANCELLED,
      `Gia sư đã hủy đơn nhận lớp ${classItem.classCode} (Môn: ${classItem.subject}).`
    );
    return ClassApplicationMapper.toDTO(updated);
  }

  if (application.status === CLASS_APPLICATION_STATUS.APPROVED) {
    const updated = await classApplicationRepository.update(applicationId, {
      status: CLASS_APPLICATION_STATUS.CANCEL_REQUESTED,
      cancellationReason: reason,
    });
    await notifyAdmins(
      NOTIFICATION_TYPES.CLASS_APPLICATION_CANCEL_REQUESTED,
      `Gia sư xin hủy lớp đã nhận ${classItem.classCode} (Môn: ${classItem.subject}), cần được duyệt.`
    );
    return ClassApplicationMapper.toDTO(updated);
  }

  throw new AppError(MESSAGE.CLASS_APPLICATION_CANCEL_INVALID_STATUS, HTTP_STATUS.BAD_REQUEST);
};

// ──────────────────────────── Luồng mời gia sư trực tiếp (gia sư phản hồi) ────────────────────────────

// Gia sư xem danh sách lời mời dạy lớp gửi tới mình (mặc định các lời mời đang chờ phản hồi).
const getMyInvitations = async (userId, query = {}) => {
  const tutor = await tutorRepository.findByUserId(userId);
  if (!tutor) throw new AppError(MESSAGE.TUTOR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const status = query.status && query.status !== "all" ? query.status : CLASS_APPLICATION_STATUS.INVITED;

  const { docs, totalItems } = await classApplicationRepository.findInvitationsByTutor(tutor._id, {
    status,
    page,
    limit,
  });

  return {
    invitations: ClassApplicationMapper.toInvitationDTOs(docs),
    pagination: buildPagination({ page, limit, totalItems }),
  };
};

// Tìm lời mời (origin=invite, đang INVITED) thuộc về gia sư đang đăng nhập.
const findOwnPendingInvitation = async (userId, applicationId) => {
  const application = await classApplicationRepository.findById(applicationId);
  if (!application || application.origin !== CLASS_APPLICATION_ORIGIN.INVITE) {
    throw new AppError(MESSAGE.CLASS_INVITE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  const tutorUserId = application.tutorId?.userId?._id ?? application.tutorId?.userId;
  if (String(tutorUserId) !== String(userId)) {
    throw new AppError(MESSAGE.CLASS_INVITE_NOT_FOUND, HTTP_STATUS.FORBIDDEN);
  }

  if (application.status !== CLASS_APPLICATION_STATUS.INVITED) {
    throw new AppError(MESSAGE.CLASS_INVITE_NOT_PENDING, HTTP_STATUS.BAD_REQUEST);
  }

  return application;
};

// Gia sư đồng ý lời mời → đơn chuyển SELECTED (vào hàng chờ admin duyệt như luồng chọn gia sư).
const acceptInvitation = async (userId, applicationId) => {
  const application = await findOwnPendingInvitation(userId, applicationId);
  const classItem = application.classId;

  const updated = await classApplicationRepository.update(applicationId, {
    status: CLASS_APPLICATION_STATUS.SELECTED,
  });

  const tutorUser = await userRepository.findById(userId);
  const tutorName = tutorUser?.fullName || "Gia sư";
  const posterUserId = classItem.createdBy?._id ?? classItem.createdBy;

  await Promise.all([
    // Báo cho chính gia sư: đã nhận lớp, đang chờ admin duyệt
    notificationService.createNotification({
      userId,
      type: NOTIFICATION_TYPES.CLASS_APPLICATION_SELECTED,
      message: `Bạn đã đồng ý nhận lớp ${classItem.classCode} (Môn: ${classItem.subject}). Vui lòng chờ admin xét duyệt.`,
    }),
    posterUserId &&
      notificationService.createNotification({
        userId: posterUserId,
        type: NOTIFICATION_TYPES.CLASS_INVITE_ACCEPTED,
        message: `Gia sư ${tutorName} đã đồng ý nhận lớp ${classItem.classCode} (Môn: ${classItem.subject}) của bạn. Vui lòng chờ admin xét duyệt.`,
      }),
    notifyAdmins(
      NOTIFICATION_TYPES.CLASS_APPLICATION_SELECTED,
      `Gia sư ${tutorName} đã đồng ý lời mời lớp ${classItem.classCode} - Môn: ${classItem.subject}. Vui lòng duyệt lớp.`,
    ),
  ]);

  return ClassApplicationMapper.toDTO(updated);
};

// Gia sư từ chối lời mời (kèm lý do) → đơn INVITE_DECLINED, báo người đăng (KHÔNG qua admin).
const declineInvitation = async (userId, applicationId, reason) => {
  const application = await findOwnPendingInvitation(userId, applicationId);
  const classItem = application.classId;

  const updated = await classApplicationRepository.update(applicationId, {
    status: CLASS_APPLICATION_STATUS.INVITE_DECLINED,
    rejectionReason: reason,
  });

  const tutorUser = await userRepository.findById(userId);
  const tutorName = tutorUser?.fullName || "Gia sư";
  const posterUserId = classItem.createdBy?._id ?? classItem.createdBy;

  if (posterUserId) {
    await notificationService.createNotification({
      userId: posterUserId,
      type: NOTIFICATION_TYPES.CLASS_INVITE_DECLINED,
      message: `Gia sư ${tutorName} đã từ chối dạy lớp ${classItem.classCode} (Môn: ${classItem.subject}) của bạn. Lý do: ${reason}`,
    });
  }

  return ClassApplicationMapper.toDTO(updated);
};

module.exports = {
  applyForClass,
  getApplicantsForPoster,
  selectApplicant,
  getMyApplications,
  cancelApplication,
  getMyInvitations,
  acceptInvitation,
  declineInvitation,
};
