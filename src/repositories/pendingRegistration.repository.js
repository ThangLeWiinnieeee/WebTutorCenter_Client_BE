const PendingRegistration = require("../models/pendingRegistration.model");
const { getPendingExpiry } = require("../models/pendingRegistration.model");

// Tạo mới hoặc cập nhật dữ liệu đăng ký tạm theo email (ghi đè và gia hạn hạn dùng)
const upsert = async ({ email, fullName, password, role, phone, dateOfBirth }) => {
  return await PendingRegistration.findOneAndUpdate(
    { email },
    {
      email,
      fullName,
      password,
      role,
      phone,
      dateOfBirth,
      expiresAt: getPendingExpiry(),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

// Chỉ lấy dữ liệu còn hạn (phòng trường hợp TTL chưa kịp dọn)
const findActiveByEmail = async (email) => {
  return await PendingRegistration.findOne({ email, expiresAt: { $gt: new Date() } });
};

// Xoá dữ liệu đăng ký tạm theo email
const deleteByEmail = async (email) => {
  return await PendingRegistration.deleteMany({ email });
};

module.exports = {
  upsert,
  findActiveByEmail,
  deleteByEmail,
};
