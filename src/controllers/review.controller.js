const reviewService = require("../services/review.service");
const { successResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");

// ──────────────────────────── Người đăng / công khai ────────────────────────────

// Tạo đánh giá mới cho gia sư
const createReview = async (req, res, next) => {
  try {
    const data = await reviewService.createReview(req.user.id, req.body);
    return successResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: MESSAGE.REVIEW_CREATE_SUCCESS,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách đánh giá công khai của một gia sư
const getTutorReviews = async (req, res, next) => {
  try {
    const data = await reviewService.getTutorReviews(req.params.tutorId, req.query);
    return successResponse(res, {
      message: MESSAGE.REVIEW_LIST_SUCCESS,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Gia sư phản hồi một đánh giá của chính mình (1 lần duy nhất)
const replyToReview = async (req, res, next) => {
  try {
    const data = await reviewService.replyToReview(req.user.id, req.params.id, req.body.comment);
    return successResponse(res, {
      message: MESSAGE.REVIEW_REPLY_SUCCESS,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────── Admin ────────────────────────────

// Lấy danh sách gia sư kèm thống kê đánh giá cho admin
const getAdminReviewTutors = async (req, res, next) => {
  try {
    const data = await reviewService.getTutorsForAdmin(req.query);
    return successResponse(res, {
      message: MESSAGE.REVIEW_ADMIN_TUTORS_SUCCESS,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách đánh giá của một gia sư cho admin
const getAdminTutorReviews = async (req, res, next) => {
  try {
    const data = await reviewService.getTutorReviewsForAdmin(req.params.tutorId, req.query);
    return successResponse(res, {
      message: MESSAGE.REVIEW_LIST_SUCCESS,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Xoá mềm một đánh giá
const softDeleteReview = async (req, res, next) => {
  try {
    const result = await reviewService.softDeleteReview(req.params.id, req.user.id);
    return successResponse(res, {
      message: MESSAGE.REVIEW_DELETE_SUCCESS,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getTutorReviews,
  replyToReview,
  getAdminReviewTutors,
  getAdminTutorReviews,
  softDeleteReview,
};
