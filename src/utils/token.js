const jwt = require("jsonwebtoken");

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

// Tạo refresh token (JWT, mặc định hết hạn 7 ngày)
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    algorithm: JWT_ALG,
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
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

// Reset token dùng riêng cho luồng quên mật khẩu, hết hạn sau 15 phút
const generateResetToken = (payload) => {
  return jwt.sign(
    { ...payload, purpose: "reset_password" },
    process.env.ACCESS_TOKEN_SECRET,
    { algorithm: JWT_ALG, expiresIn: "15m" }
  );
};

// Xác thực reset token và kiểm tra đúng mục đích đổi mật khẩu
const verifyResetToken = (token) => {
  const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, { algorithms: [JWT_ALG] });
  if (decoded.purpose !== "reset_password") {
    throw new Error("Token không đúng mục đích");
  }
  return decoded;
};

const isProduction = process.env.NODE_ENV === "production";

// Khi FE (app.tenmien.com) và BE (api.tenmien.com) cùng domain cha, đặt
// COOKIE_DOMAIN=".tenmien.com" để cookie chia sẻ giữa các subdomain (first-party).
// Bỏ trống ở localhost để cookie mặc định host-only.
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  // Cùng domain cha là same-site → "lax" đủ và an toàn hơn "none".
  // Vẫn cần Secure vì chạy HTTPS. Dev (localhost) giữ "strict".
  secure: isProduction,
  sameSite: isProduction ? "lax" : "strict",
  domain: COOKIE_DOMAIN,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateResetToken,
  verifyResetToken,
  REFRESH_TOKEN_COOKIE_OPTIONS,
  REFRESH_TOKEN_CLEAR_OPTIONS,
};
