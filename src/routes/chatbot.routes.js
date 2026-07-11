const express = require("express");
const router = express.Router();

const chatbotController = require("../controllers/chatbot.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { buildChatbotRequest } = require("../middlewares/chatbot.middleware");
const { chatbotRateLimiter } = require("../middlewares/rateLimit.middleware");
const { validate, askSchema } = require("../validations/chatbot.validation");

// Cho phép cả khách lẫn người đã đăng nhập. Có token → forward xuống chatbot để trả lời
// câu hỏi cá nhân ("của tôi"); không token → vẫn trả lời câu hỏi chung.
// Thứ tự: rate limit (chặn spam sớm) → optional auth → validate body → dựng req.chatbotRequest → controller.
router.post(
  "/",
  chatbotRateLimiter,
  authMiddleware.optional,
  validate(askSchema),
  buildChatbotRequest,
  chatbotController.ask
);

module.exports = router;
