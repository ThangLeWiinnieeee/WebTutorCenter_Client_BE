const OTP_LENGTH = 6;
const OTP_EXPIRES_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 120; // 2 phút
const MAX_OTP_ATTEMPTS = 5; // nhập sai quá số lần này thì OTP bị vô hiệu (chống brute-force 6 chữ số)

// Sinh mã OTP ngẫu nhiên 6 chữ số
const generateOtp = () => {
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
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
  getOtpExpiry,
  isResendTooSoon,
  getResendWaitSeconds,
  OTP_EXPIRES_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
  MAX_OTP_ATTEMPTS,
};
