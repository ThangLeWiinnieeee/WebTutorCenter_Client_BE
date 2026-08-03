const mongoose = require("mongoose");
const OTP_TYPE = require("../constants/otpType");

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Email không hợp lệ"],
    },
    otp: {
      type: String,
      required: true,
      // OTP mới lưu HMAC SHA-256; vẫn nhận 6 chữ số để bản ghi TTL cũ không bị breaking khi deploy.
      match: [/^(?:\d{6}|[a-f0-9]{64})$/, "OTP không hợp lệ"],
      select: false,
    },
    type: {
      type: String,
      enum: Object.values(OTP_TYPE),
      required: true,
    },
    // Số lần nhập sai OTP; vượt ngưỡng thì OTP bị vô hiệu (chống brute-force). Mặc định 0 → an toàn với doc cũ.
    attempts: {
      type: Number,
      default: 0,
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

// Index tìm kiếm nhanh theo email + type
otpSchema.index({ email: 1, type: 1 });

const Otp = mongoose.model("Otp", otpSchema);

module.exports = Otp;
