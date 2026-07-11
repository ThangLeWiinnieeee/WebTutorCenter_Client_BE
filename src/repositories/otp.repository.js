const Otp = require("../models/otp.model");

const create = async ({ email, otp, type, expiresAt }) => {
  return await Otp.create({ email, otp, type, expiresAt });
};

// Chỉ lấy OTP còn hạn và mới nhất (phòng trường hợp TTL chưa kịp dọn OTP cũ)
const findLatestActiveByEmailAndType = async (email, type) => {
  return await Otp.findOne({ email, type, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
};

// Tăng số lần nhập sai (nguyên tử qua $inc) và trả về số lần sau khi tăng.
const incrementAttempts = async (otpId) => {
  const doc = await Otp.findByIdAndUpdate(otpId, { $inc: { attempts: 1 } }, { new: true });
  return doc ? doc.attempts : Infinity;
};

const deleteByEmailAndType = async (email, type) => {
  return await Otp.deleteMany({ email, type });
};

// Xóa toàn bộ OTP theo email (xóa vĩnh viễn tài khoản)
const deleteByEmail = async (email) => {
  return await Otp.deleteMany({ email });
};

module.exports = {
  create,
  findLatestActiveByEmailAndType,
  incrementAttempts,
  deleteByEmailAndType,
  deleteByEmail,
};
