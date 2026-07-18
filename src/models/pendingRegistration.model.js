const mongoose = require("mongoose");
const ROLES = require("../constants/role");
const { PHONE_REGEX } = require("../constants/tutor");

// Thời gian sống của dữ liệu đăng ký tạm — phải dài hơn vòng đời OTP để user vẫn xác thực được
const PENDING_EXPIRES_MINUTES = 60;

// Tính thời điểm hết hạn của dữ liệu đăng ký tạm
const getPendingExpiry = () => {
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + PENDING_EXPIRES_MINUTES);
  return expires;
};

// Lưu tạm thông tin tài khoản trong lúc chờ xác thực OTP.
// Chỉ khi OTP đúng, dữ liệu này mới được ghi vào collection `users`.
const pendingRegistrationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Email không hợp lệ"],
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    // Mật khẩu đã được hash trước khi lưu (không lưu plaintext)
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.USER,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
      match: [PHONE_REGEX, "Số điện thoại không hợp lệ"],
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      // TTL index: MongoDB tự xóa document khi expiresAt đã qua
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
  }
);

const PendingRegistration = mongoose.model("PendingRegistration", pendingRegistrationSchema);

module.exports = PendingRegistration;
module.exports.getPendingExpiry = getPendingExpiry;
module.exports.PENDING_EXPIRES_MINUTES = PENDING_EXPIRES_MINUTES;
