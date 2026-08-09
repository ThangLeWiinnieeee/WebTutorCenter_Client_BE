const express = require("express");
const router = express.Router();

const reviewController = require("../controllers/review.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const roleMiddleware = require("../middlewares/role.middleware");
const ROLES = require("../constants/role");
const {
  validate,
  validateQuery,
  createReviewSchema,
  replyReviewSchema,
  listTutorReviewsQuerySchema,
} = require("../validations/review.validation");
const { validateObjectIdParams } = require("../validations/common.validation");

// Người đăng bài tạo đánh giá gia sư (lớp đã hoàn thành) — service tự kiểm tra quyền
router.post("/", authMiddleware, validate(createReviewSchema), reviewController.createReview);

// Gia sư phản hồi một đánh giá của chính mình (chỉ 1 lần) — service kiểm tra quyền sở hữu
router.post(
  "/:id/reply",
  authMiddleware,
  roleMiddleware(ROLES.TUTOR),
  validateObjectIdParams("id"),
  validate(replyReviewSchema),
  reviewController.replyToReview
);

// Danh sách đánh giá công khai của một gia sư (hiển thị ở trang chi tiết gia sư)
router.get(
  "/tutor/:tutorId",
  validateObjectIdParams("tutorId"),
  validateQuery(listTutorReviewsQuerySchema),
  reviewController.getTutorReviews
);

module.exports = router;
