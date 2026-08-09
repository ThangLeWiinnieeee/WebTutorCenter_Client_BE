const jwt = require("jsonwebtoken");
const { createHmac, randomUUID, timingSafeEqual } = require("crypto");
const MESSAGE = require("../constants/message");

// Pin thuật toán HS256 cho cả ký và xác thực. Khi verify, chỉ chấp nhận HS256 để chặn
// algorithm-confusion (vd token giả với alg "none" hoặc RS256 lợi dụng public key).
const JWT_ALG = "HS256";

// Tạo access token (JWT, mặc định hết hạn 15 phút)
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    algorithm: JWT_ALG,
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
  });
};

// Thời hạn refresh token, tính bằng NGÀY. Refresh token được xoay vòng ở mỗi lần
// /auth/refresh-token nên đây là "hạn không hoạt động": dùng app trong vòng ngần này
// ngày thì phiên gia hạn tiếp, im lặng lâu hơn mới phải đăng nhập lại.
// Một nguồn duy nhất cho cả hạn JWT lẫn maxAge cookie để hai giá trị không lệch nhau.
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 30;

// Tạo refresh token (JWT)
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    algorithm: JWT_ALG,
    expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d`,
    jwtid: randomUUID(),
  });
};

// Xác thực access token
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, { algorithms: [JWT_ALG] });
};

// Xác thực refresh token
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, { algorithms: [JWT_ALG] });
};

const getPasswordVersion = (passwordHash) => {
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error(MESSAGE.REFRESH_TOKEN_SECRET_MISSING);
  }
  return createHmac("sha256", process.env.REFRESH_TOKEN_SECRET)
    .update(`reset-password:${passwordHash}`)
    .digest("hex");
};

// Reset token gắn với password hash hiện tại: đổi mật khẩu xong thì token tự hết hiệu lực.
const generateResetToken = (payload, passwordHash) => {
  return jwt.sign(
    { ...payload, purpose: "reset_password", passwordVersion: getPasswordVersion(passwordHash) },
    process.env.REFRESH_TOKEN_SECRET,
    { algorithm: JWT_ALG, expiresIn: "15m" }
  );
};

// Xác thực reset token và kiểm tra đúng mục đích đổi mật khẩu
const verifyResetToken = (token) => {
  const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, { algorithms: [JWT_ALG] });
  if (decoded.purpose !== "reset_password" || typeof decoded.passwordVersion !== "string") {
    throw new Error(MESSAGE.RESET_TOKEN_INVALID);
  }
  return decoded;
};

const isResetTokenCurrent = (decoded, passwordHash) => {
  const current = Buffer.from(getPasswordVersion(passwordHash));
  const fromToken = Buffer.from(decoded.passwordVersion || "");
  return current.length === fromToken.length && timingSafeEqual(current, fromToken);
};

const isProduction = process.env.NODE_ENV === "production";

// Production Vercel gọi REST qua /api reverse proxy nên nên để trống để cookie
// host-only trên origin FE. Chỉ đặt COOKIE_DOMAIN khi chủ động cần chia sẻ subdomain.
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  // Vercel /api proxy khiến auth là first-party → "lax" đủ và an toàn hơn "none".
  // Vẫn cần Secure vì production chạy HTTPS. Dev localhost giữ "strict".
  secure: isProduction,
  sameSite: isProduction ? "lax" : "strict",
  domain: COOKIE_DOMAIN,
  path: "/",
  maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
};

// Options xóa cookie phải KHỚP domain/path/secure/sameSite với lúc set,
// nếu không trình duyệt sẽ không xóa được cookie khi logout.
const REFRESH_TOKEN_CLEAR_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "lax" : "strict",
  domain: COOKIE_DOMAIN,
  path: "/",
};

// ─────────────────── Phân biệt client Web / Mobile ───────────────────
//
// Access token GIỐNG HỆT NHAU cho cả hai (cùng JWT, cùng header Authorization) — mobile
// không cần hàm riêng. Chỉ REFRESH TOKEN khác ở KÊNH VẬN CHUYỂN, do ràng buộc ngược nhau:
//
//   Web    : cookie httpOnly — JS của trang không đọc được nên XSS không trộm được token.
//   Mobile : trả thẳng trong body — React Native không có cookie jar bền (mất khi xoá dữ
//            liệu app / cài lại), app tự lưu vào SecureStore của hệ điều hành.
//
// Mobile dùng CHUNG toàn bộ logic auth với web (cùng hàm sinh/xác thực token, cùng
// service, cùng route) — chỉ rẽ nhánh đúng 1 dòng ở mỗi hàm dưới đây, nên không tách
// thành cặp hàm riêng cho từng nền tảng.
// App mobile phải gửi header này ở MỌI request thì BE mới nhận ra.
const MOBILE_CLIENT_HEADER = "x-client-platform";
const MOBILE_CLIENT_VALUE = "mobile";

// true khi request đến từ app mobile (dựa vào header app tự khai báo).
const isMobileClient = (req) =>
  String(req.get?.(MOBILE_CLIENT_HEADER) || "").toLowerCase() === MOBILE_CLIENT_VALUE;

// Phát refresh token theo đúng kênh của client, trả về phần cần trộn vào `data` của response.
// Dùng chung ở login / verify-otp / google-login / refresh-token.
const sendRefreshToken = (req, res, refreshToken) => {
  if (isMobileClient(req)) return { refreshToken };
  res.cookie("refreshToken", refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
  return {};
};

// Đọc refresh token lúc gia hạn: mobile gửi trong body, web nằm ở cookie.
const readRefreshToken = (req) =>
  isMobileClient(req) ? req.body?.refreshToken : req.cookies?.refreshToken;

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateResetToken,
  verifyResetToken,
  isResetTokenCurrent,
  REFRESH_TOKEN_CLEAR_OPTIONS,
  isMobileClient,
  sendRefreshToken,
  readRefreshToken,
};
