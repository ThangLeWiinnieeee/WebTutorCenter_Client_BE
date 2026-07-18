const rateLimit = require("express-rate-limit");
const { errorResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");

const isProduction = process.env.NODE_ENV === "production";

// Giới hạn tần suất gọi /api/chatbot theo IP (chống đốt quota LLM); chỉ siết ở production
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

// Số lần đăng nhập sai được bỏ qua trước khi hiện số lượt còn lại
const LOGIN_FREE_ATTEMPTS = 5; // 5 lần sai đầu chỉ báo "sai mật khẩu", từ lần 6 mới hiện số lượt còn lại

// Giới hạn số lần đăng nhập thất bại theo IP (chống brute-force)
const loginRateLimiter = rateLimit({
  windowMs: Number(process.env.LOGIN_RATE_WINDOW_MS) || 15 * 60 * 1000, // 15 phút
  max: Number(process.env.LOGIN_RATE_MAX) || 10, // tối đa 10 lần sai / 15 phút / IP rồi khoá
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // đăng nhập thành công không tính vào giới hạn
  handler: (req, res) =>
    errorResponse(res, {
      statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      message: MESSAGE.LOGIN_RATE_LIMITED,
    }),
});

// Giới hạn thao tác OTP theo IP (chống email-bombing và brute-force OTP)
const otpRateLimiter = rateLimit({
  windowMs: Number(process.env.OTP_RATE_WINDOW_MS) || 15 * 60 * 1000, // 15 phút
  max: Number(process.env.OTP_RATE_MAX) || 30, // tối đa 30 thao tác OTP / 15 phút / IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    errorResponse(res, {
      statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      message: MESSAGE.OTP_RATE_LIMITED,
    }),
});

module.exports = { chatbotRateLimiter, loginRateLimiter, otpRateLimiter, LOGIN_FREE_ATTEMPTS };
