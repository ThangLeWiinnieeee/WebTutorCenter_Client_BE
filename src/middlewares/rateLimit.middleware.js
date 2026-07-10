const rateLimit = require("express-rate-limit");
const { errorResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");

// Chống spam /api/chatbot để không đốt quota LLM (Groq). Đếm theo IP trong bộ nhớ (per-instance):
// đủ cho spam cơ bản; chạy nhiều instance thì mỗi instance đếm riêng — muốn giới hạn chính xác
// toàn cục cần store chung (Redis) qua option `store`. Chỉnh số ở CHATBOT_RATE_* khi biết lưu lượng thật.
const isProduction = process.env.NODE_ENV === "production";

const chatbotRateLimiter = rateLimit({
  windowMs: Number(process.env.CHATBOT_RATE_WINDOW_MS) || 60 * 1000, // cửa sổ 1 phút
  max: Number(process.env.CHATBOT_RATE_MAX) || 20, // tối đa 20 câu hỏi / phút / IP
  standardHeaders: true, // trả header RateLimit-* để FE biết còn bao nhiêu lượt
  legacyHeaders: false,
  // Local/dev không có quota LLM thật + hay test nhiều → bỏ giới hạn cho khỏi vướng.
  // Chỉ siết ở production (khớp với trust proxy cũng chỉ bật ở production trong app.js).
  skip: () => !isProduction,
  handler: (req, res) =>
    errorResponse(res, {
      statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      message: MESSAGE.CHATBOT_RATE_LIMITED,
    }),
});

module.exports = { chatbotRateLimiter };
