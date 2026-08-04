const mongoose = require("mongoose");
const reviewRepository = require("../repositories/review.repository");
const tutorRepository = require("../repositories/tutor.repository");
const classRepository = require("../repositories/class.repository");
const classApplicationRepository = require("../repositories/class.application.repository");
const outboxService = require("./outbox.service");
const { NOTIFICATION_TYPES } = require("../constants/notification");
const { CLASS_STATUS } = require("../constants/class");
const { ReviewMapper } = require("../mappers");
const AppError = require("../utils/AppError");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");
const { buildPagination } = require("../utils/pagination");
const { withTransaction } = require("../utils/transaction");

// Kiểm tra id có phải ObjectId hợp lệ, không thì ném lỗi 404
const assertValidObjectId = (id, message) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(message, HTTP_STATUS.NOT_FOUND);
  }
};

// Tính lại điểm trung bình của gia sư từ các đánh giá còn hiệu lực và lưu vào hồ sơ
const recomputeTutorRating = async (tutorId, { session } = {}) => {
  const { sum, count } = await reviewRepository.aggregateActiveByTutor(tutorId, { session });
  const averageRating = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
  await tutorRepository.update(
    tutorId,
    { ratingSum: sum, reviewCount: count, averageRating },
    { session },
  );
  return { ratingSum: sum, reviewCount: count, averageRating };
};

// Người đăng bài đánh giá gia sư của một lớp đã hoàn thành.
const createReview = async (reviewerId, { classId, rating, comment }) => {
  assertValidObjectId(classId, MESSAGE.CLASS_NOT_FOUND);

  const classItem = await classRepository.findById(classId);
  if (!classItem) throw new AppError(MESSAGE.CLASS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

  // Chỉ đánh giá khi lớp đã hoàn thành (cả người đăng và gia sư đều đã xác nhận)
  if (classItem.status !== CLASS_STATUS.COMPLETED) {
    throw new AppError(MESSAGE.REVIEW_CLASS_NOT_COMPLETED, HTTP_STATUS.BAD_REQUEST);
  }

  // Chỉ người đăng bài (chủ lớp) mới được đánh giá gia sư
  if (String(classItem.createdBy) !== String(reviewerId)) {
    throw new AppError(MESSAGE.REVIEW_NOT_POSTER, HTTP_STATUS.FORBIDDEN);
  }

  // Xác định gia sư đã được duyệt nhận lớp này
  const approvedApp = await classApplicationRepository.findApprovedByClassId(classId);
  if (!approvedApp) {
    throw new AppError(MESSAGE.REVIEW_TUTOR_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
  }
  const tutor = approvedApp.tutorId;
  const tutorId = tutor?._id ?? tutor;

  // Mỗi lớp chỉ được đánh giá một lần
  const existing = await reviewRepository.findActiveByClassAndReviewer(classId, reviewerId);
  if (existing) {
    throw new AppError(MESSAGE.REVIEW_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
  }

  const tutorUserId = tutor?.userId?._id ?? tutor?.userId;
  let reviewId;
  let summary;
  try {
    await withTransaction(async (session) => {
      const review = await reviewRepository.create(
        { tutorId, classId, reviewerId, rating, comment },
        { session },
      );
      reviewId = review._id;
      summary = await recomputeTutorRating(tutorId, { session });
      await outboxService.enqueueNotification({
        dedupeKey: `review:${review._id}:received`,
        userId: tutorUserId,
        type: NOTIFICATION_TYPES.REVIEW_RECEIVED,
        message: `Bạn vừa nhận được đánh giá ${rating} sao cho lớp ${classItem.classCode}. Xem trong trang chi tiết của bạn.`,
      }, { session });
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError(MESSAGE.REVIEW_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }
    throw error;
  }

  const review = await reviewRepository.findById(reviewId);
  await review.populate({ path: "reviewerId", select: "fullName avatar" });

  return {
    review: ReviewMapper.toDTO(review),
    averageRating: summary.averageRating,
    reviewCount: summary.reviewCount,
  };
};

// Danh sách đánh giá công khai của một gia sư (trang chi tiết gia sư) — có phân trang.
const getTutorReviews = async (tutorId, query = {}) => {
  assertValidObjectId(tutorId, MESSAGE.TUTOR_NOT_FOUND);
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 5));

  const tutor = await tutorRepository.findById(tutorId);
  if (!tutor) throw new AppError(MESSAGE.TUTOR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

  const { items, totalItems } = await reviewRepository.findActiveByTutorId(tutorId, { page, limit });

  return {
    reviews: ReviewMapper.toDTOs(items),
    summary: {
      averageRating: tutor.averageRating ?? 0,
      reviewCount: tutor.reviewCount ?? 0,
    },
    pagination: buildPagination({ page, limit, totalItems }),
  };
};

// Gia sư phản hồi một đánh giá của chính mình — chỉ được phản hồi MỘT lần.
const replyToReview = async (tutorUserId, reviewId, comment) => {
  assertValidObjectId(reviewId, MESSAGE.REVIEW_NOT_FOUND);

  // Người gọi phải có hồ sơ gia sư
  const tutor = await tutorRepository.findByUserId(tutorUserId);
  if (!tutor) throw new AppError(MESSAGE.REVIEW_REPLY_NOT_OWNER, HTTP_STATUS.FORBIDDEN);

  const review = await reviewRepository.findById(reviewId);
  if (!review || review.deletedAt) {
    throw new AppError(MESSAGE.REVIEW_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  // Chỉ gia sư được đánh giá mới được phản hồi
  if (String(review.tutorId) !== String(tutor._id)) {
    throw new AppError(MESSAGE.REVIEW_REPLY_NOT_OWNER, HTTP_STATUS.FORBIDDEN);
  }

  // Mỗi đánh giá chỉ được phản hồi một lần
  if (review.reply) {
    throw new AppError(MESSAGE.REVIEW_REPLY_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
  }

  const reply = { comment: comment.trim(), repliedAt: new Date() };
  await withTransaction(async (session) => {
    const updated = await reviewRepository.setReply(reviewId, reply, { session });
    if (!updated) {
      throw new AppError(MESSAGE.REVIEW_REPLY_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }
    await outboxService.enqueueNotification({
      dedupeKey: `review:${reviewId}:replied`,
      userId: review.reviewerId,
      type: NOTIFICATION_TYPES.REVIEW_REPLIED,
      message: MESSAGE.NOTIF_REVIEW_REPLIED,
    }, { session });
  });

  const updated = await reviewRepository.findById(reviewId);
  await updated.populate({ path: "reviewerId", select: "fullName avatar" });

  return { review: ReviewMapper.toDTO(updated) };
};

// ──────────────────────────── Admin: quản lý đánh giá theo gia sư ────────────────────────────

// Danh sách gia sư (kèm số lượt + điểm đánh giá) để admin chọn xem đánh giá
const getTutorsForAdmin = async (query = {}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const keyword = query.keyword || "";

  const { items, totalItems } = await tutorRepository.findApprovedForReviewAdmin({ page, limit, keyword });
  const tutors = items.map((t) => ({
    id: t._id,
    fullName: t.user?.fullName || null,
    email: t.user?.email || null,
    avatar: t.user?.avatar || null,
    subjects: t.subjects || [],
    averageRating: t.averageRating ?? 0,
    reviewCount: t.reviewCount ?? 0,
  }));

  return {
    tutors,
    pagination: buildPagination({ page, limit, totalItems }),
  };
};

// Tất cả đánh giá còn hiệu lực của một gia sư (admin xem) — có phân trang
const getTutorReviewsForAdmin = async (tutorId, query = {}) => {
  assertValidObjectId(tutorId, MESSAGE.TUTOR_NOT_FOUND);
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));

  const tutor = await tutorRepository.findById(tutorId);
  if (!tutor) throw new AppError(MESSAGE.TUTOR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

  const { items, totalItems } = await reviewRepository.findActiveByTutorIdForAdmin(tutorId, { page, limit });

  return {
    tutor: {
      id: tutor._id,
      fullName: tutor.userId?.fullName || null,
      avatar: tutor.userId?.avatar || null,
      averageRating: tutor.averageRating ?? 0,
      reviewCount: tutor.reviewCount ?? 0,
    },
    reviews: ReviewMapper.toAdminDTOs(items),
    pagination: buildPagination({ page, limit, totalItems }),
  };
};

// Admin xóa mềm một đánh giá (đưa vào thùng rác) + cập nhật lại điểm gia sư
const softDeleteReview = async (reviewId, adminUserId) => {
  assertValidObjectId(reviewId, MESSAGE.REVIEW_NOT_FOUND);
  await withTransaction(async (session) => {
    const deleted = await reviewRepository.softDelete(reviewId, adminUserId, { session });
    if (!deleted) throw new AppError(MESSAGE.REVIEW_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    await recomputeTutorRating(deleted.tutorId, { session });
  });
  return { id: reviewId };
};

module.exports = {
  recomputeTutorRating,
  createReview,
  getTutorReviews,
  replyToReview,
  getTutorsForAdmin,
  getTutorReviewsForAdmin,
  softDeleteReview,
};
