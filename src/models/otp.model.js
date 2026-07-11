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
      match: [/^\d{6}$/, "OTP phải là chuỗi 6 chữ số"],
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
