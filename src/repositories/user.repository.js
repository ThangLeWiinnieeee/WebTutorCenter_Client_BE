const User = require("../models/user.model");

// Tìm người dùng theo email (tuỳ chọn lấy kèm mật khẩu)
const findByEmail = async (email, includePassword = false) => {
  const query = User.findOne({ email });
  if (includePassword) query.select("+password");
  return await query;
};

// Tìm người dùng theo id (bỏ tài khoản đã xoá mềm)
const findById = async (id, includePassword = false) => {
  const query = User.findOne({ _id: id, deletedAt: null });
  if (includePassword) query.select("+password");
  return await query;
};

// Lấy danh sách người dùng cho admin (lọc + phân trang)
const findManyForAdmin = async (filters, { page, limit }) => {
  const skip = (page - 1) * limit;
  const queryFilters = { deletedAt: null, ...filters };
  const [users, totalItems] = await Promise.all([
    User.find(queryFilters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(queryFilters),
  ]);

  return { users, totalItems };
};

// Tạo người dùng mới
const create = async (userData) => {
  const user = new User(userData);
  return await user.save();
};

// ─── Phiên đăng nhập (mỗi thiết bị 1 session) ───

// Mở phiên mới cho một thiết bị
const addSession = async (userId, session) => {
  return await User.findByIdAndUpdate(userId, { $push: { sessions: session } }, { new: true });
};

// Tìm người dùng đang giữ refresh token này (dùng lúc gia hạn)
const findBySessionToken = async (token) => {
  return await User.findOne({ "sessions.token": token }).select("+sessions");
};

// Xoay token của đúng phiên đang gia hạn + đánh dấu vừa hoạt động
const rotateSessionToken = async (userId, oldToken, newToken) => {
  return await User.updateOne(
    { _id: userId, "sessions.token": oldToken },
    { $set: { "sessions.$.token": newToken, "sessions.$.lastUsedAt": new Date() } }
  );
};

// Thu hồi 1 phiên theo token (đăng xuất chính thiết bị đang gọi)
const removeSessionByToken = async (userId, token) => {
  return await User.findByIdAndUpdate(userId, { $pull: { sessions: { token } } });
};

// Thu hồi 1 phiên theo id (đăng xuất thiết bị khác trong danh sách)
const removeSessionById = async (userId, sessionId) => {
  return await User.updateOne({ _id: userId }, { $pull: { sessions: { _id: sessionId } } });
};

// Thu hồi mọi phiên, trừ phiên đang giữ `keepToken` nếu có
const removeSessions = async (userId, { keepToken = null } = {}) => {
  const pull = keepToken ? { token: { $ne: keepToken } } : {};
  return await User.updateOne({ _id: userId }, { $pull: { sessions: pull } });
};

// Danh sách phiên của người dùng
const findSessions = async (userId) => {
  const user = await User.findById(userId).select("+sessions");
  return user?.sessions || [];
};

// Xoá hẳn tài khoản local chưa xác thực để giải phóng email cho đăng ký mới
const hardDeleteUnverifiedLocal = async (userId) => {
  return await User.findOneAndDelete({ _id: userId, isVerified: false });
};

// Cập nhật mật khẩu của người dùng
const updatePassword = async (userId, hashedPassword) => {
  return await User.findByIdAndUpdate(userId, { password: hashedPassword }, { new: true });
};

// Cập nhật thông tin cá nhân của người dùng
const updateProfile = async (userId, updateData) => {
  return await User.findOneAndUpdate(
    { _id: userId, deletedAt: null },
    updateData,
    { new: true, runValidators: true },
  );
};

// Cập nhật vai trò của người dùng
const updateRole = async (userId, role) => {
  return await User.findOneAndUpdate({ _id: userId, deletedAt: null }, { role }, { new: true });
};

// Cập nhật trạng thái hoạt động của người dùng
const updateStatus = async (userId, isActive) => {
  return await User.findOneAndUpdate({ _id: userId, deletedAt: null }, { isActive }, { new: true });
};

// Cập nhật thông tin người dùng (từ admin)
const updateByAdmin = async (userId, updateData) => {
  return await User.findOneAndUpdate(
    { _id: userId, deletedAt: null },
    updateData,
    { new: true, runValidators: true },
  );
};

// Xoá mềm tài khoản người dùng (từ admin)
const softDeleteByAdmin = async (userId, adminUserId) => {
  return await User.findOneAndUpdate(
    { _id: userId, deletedAt: null },
    {
      isActive: false,
      sessions: [], // admin xoá tài khoản → đá khỏi mọi thiết bị
      deletedAt: new Date(),
      deletedBy: adminUserId,
    },
    { new: true },
  );
};

// Lấy tất cả người dùng đang hoạt động theo vai trò
const findAllByRole = async (role) => {
  return await User.find({ role, deletedAt: null, isActive: true }).lean();
};

// ──────────────────────────── Thùng rác (soft-delete) ────────────────────────────

// Lấy danh sách tài khoản trong thùng rác
const findDeleted = async ({ page, limit }) => {
  const skip = (page - 1) * limit;
  const filter = { deletedAt: { $ne: null } };
  const [users, totalItems] = await Promise.all([
    User.find(filter).sort({ deletedAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  return { users, totalItems };
};

// Khôi phục tài khoản khỏi thùng rác (kích hoạt lại để dùng được ngay)
const restore = async (userId) => {
  return await User.findOneAndUpdate(
    { _id: userId, deletedAt: { $ne: null } },
    { deletedAt: null, deletedBy: null, isActive: true },
    { new: true },
  );
};

// Xóa vĩnh viễn (hard delete) — chỉ áp dụng cho tài khoản đang ở thùng rác
const hardDelete = async (userId) => {
  return await User.findOneAndDelete({ _id: userId, deletedAt: { $ne: null } });
};

module.exports = {
  findByEmail,
  findById,
  findManyForAdmin,
  create,
  addSession,
  findBySessionToken,
  rotateSessionToken,
  removeSessionByToken,
  removeSessionById,
  removeSessions,
  findSessions,
  hardDeleteUnverifiedLocal,
  updatePassword,
  updateProfile,
  updateRole,
  updateStatus,
  updateByAdmin,
  softDeleteByAdmin,
  findAllByRole,
  findDeleted,
  restore,
  hardDelete,
};
