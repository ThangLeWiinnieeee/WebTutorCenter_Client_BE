const { createHmac, randomInt, timingSafeEqual } = require("crypto");
const MESSAGE = require("../constants/message");

const OTP_LENGTH = 6;
const OTP_EXPIRES_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 120; // 2 phút
const MAX_OTP_ATTEMPTS = 5; // nhập sai quá số lần này thì OTP bị vô hiệu (chống brute-force 6 chữ số)

// Sinh mã OTP ngẫu nhiên 6 chữ số
const generateOtp = () => String(randomInt(10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");

// HMAC ngăn kẻ lấy được DB brute-force offline không gian OTP chỉ có 1 triệu giá trị.
// Dùng refresh secret làm khóa sẵn có và domain-separate theo email/type.
const hashOtp = (otp, { email, type }) => {
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error(MESSAGE.REFRESH_TOKEN_SECRET_MISSING);
  }
  return createHmac("sha256", process.env.REFRESH_TOKEN_SECRET)
    .update(`otp:${String(email).toLowerCase()}:${type}:${otp}`)
    .digest("hex");
};

const matchesOtp = (storedOtp, otp, context) => {
  // Tương thích OTP plaintext cũ trong tối đa một vòng TTL sau khi deploy.
  const candidate = /^\d{6}$/.test(storedOtp) ? String(otp) : hashOtp(otp, context);
  const storedBuffer = Buffer.from(storedOtp);
  const candidateBuffer = Buffer.from(candidate);
  return storedBuffer.length === candidateBuffer.length && timingSafeEqual(storedBuffer, candidateBuffer);
};

// Tính thời điểm hết hạn của OTP
const getOtpExpiry = () => {
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + OTP_EXPIRES_MINUTES);
  return expires;
};

// Kiểm tra còn trong thời gian chờ giữa 2 lần gửi OTP không
const isResendTooSoon = (createdAt) => {
  if (!createdAt) return false;
  const elapsedSeconds = (Date.now() - new Date(createdAt).getTime()) / 1000;
  return elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS;
};

// Tính số giây còn phải chờ trước khi được gửi lại OTP
const getResendWaitSeconds = (createdAt) => {
  if (!createdAt) return 0;
  const elapsedSeconds = (Date.now() - new Date(createdAt).getTime()) / 1000;
  return Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds);
};

module.exports = {
  generateOtp,
  hashOtp,
  matchesOtp,
  getOtpExpiry,
  isResendTooSoon,
  getResendWaitSeconds,
  OTP_EXPIRES_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
  MAX_OTP_ATTEMPTS,
};
