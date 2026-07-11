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

// Chống brute-force đăng nhập: chỉ đếm các lần POST /api/auth/login THẤT BẠI theo IP
// (skipSuccessfulRequests → đăng nhập đúng không bị trừ lượt). Bật ở cả dev để thấy được
// countdown "còn N lần thử"; store lưu trong RAM nên restart server là reset (tiện dev).
// Số free trước khi cảnh báo do controller quyết định (LOGIN_FREE_ATTEMPTS).
const LOGIN_FREE_ATTEMPTS = 5; // 5 lần sai đầu chỉ báo "sai mật khẩu", từ lần 6 mới hiện số lượt còn lại

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

// Chống spam luồng OTP theo IP: gộp cho verify-otp / resend-otp / forgot-password /
// verify-forgot-password-otp. Chặn email-bombing (gửi mail) và brute-force OTP ở mức IP;
// lớp thứ hai là bộ đếm attempts trong OTP (MAX_OTP_ATTEMPTS) vô hiệu OTP theo từng mã.
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
