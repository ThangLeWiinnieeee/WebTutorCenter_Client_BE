const userRepository = require("../repositories/user.repository");
const { deleteAvatarFromCloudinary } = require("../utils/upload");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");
const AppError = require("../utils/AppError");
const { UserMapper } = require("../mappers");
const { hashPassword, comparePassword } = require("../utils/hash");
const ACCOUNT_TYPE = require("../constants/accountType");

// Lấy thông tin tài khoản theo id
const getUserInfo = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError(MESSAGE.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  return UserMapper.toDTO(user);
};

// Cập nhật ảnh đại diện mới và xoá ảnh cũ trên Cloudinary
const uploadAvatar = async (userId, avatarUrl) => {
  const currentUser = await userRepository.findById(userId);
  if (!currentUser) {
    throw new AppError(MESSAGE.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  const oldAvatar = currentUser.avatar;

  const user = await userRepository.updateProfile(userId, { avatar: avatarUrl });

  if (oldAvatar) {
    deleteAvatarFromCloudinary(oldAvatar);
  }

  return UserMapper.toDTO(user);
};

// Cập nhật thông tin cá nhân của người dùng
const updateProfile = async (userId, { fullName, phone, gender, dateOfBirth, avatar }) => {
  const updateData = { fullName };
  if (phone !== undefined) {
    updateData.phone = phone || null;
    if (phone) updateData.phoneActivated = true;
  }
  if (gender !== undefined) updateData.gender = gender || null;
  if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth || null;
  if (avatar !== undefined) updateData.avatar = avatar || null;

  const user = await userRepository.updateProfile(userId, updateData);
  if (!user) {
    throw new AppError(MESSAGE.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  return UserMapper.toDTO(user);
};

// Đổi mật khẩu khi đang đăng nhập.
// `revokeOtherSessions` do người dùng chọn: true thì đóng phiên ở MỌI thiết bị
// (kể cả máy đang thao tác), false thì các máy khác vẫn giữ nguyên đăng nhập.
const changePassword = async (
  userId,
  { currentPassword, newPassword, revokeOtherSessions = false }
) => {
  const user = await userRepository.findById(userId, true);
  if (!user) {
    throw new AppError(MESSAGE.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  // Tài khoản Google không có hash mật khẩu — gọi bcrypt sẽ lỗi.
  if (user.type === ACCOUNT_TYPE.GOOGLE || typeof user.password !== "string") {
    throw new AppError(MESSAGE.ACCOUNT_NOT_CHANGE_PASSWORD, HTTP_STATUS.BAD_REQUEST);
  }

  if (!(await comparePassword(currentPassword, user.password))) {
    throw new AppError(MESSAGE.CURRENT_PASSWORD_INCORRECT, HTTP_STATUS.BAD_REQUEST);
  }

  if (await comparePassword(newPassword, user.password)) {
    throw new AppError(MESSAGE.RESET_PASSWORD_SAME_AS_OLD, HTTP_STATUS.BAD_REQUEST);
  }

  await userRepository.updatePassword(user._id, await hashPassword(newPassword));
  if (revokeOtherSessions) await userRepository.removeSessions(user._id);
};

// ─── Quản lý phiên đăng nhập theo thiết bị ───

// Danh sách thiết bị đang đăng nhập. `currentToken` để đánh dấu đâu là máy đang dùng
// → app không cho tự đăng xuất chính mình bằng nút "đăng xuất thiết bị này".
const listSessions = async (userId, currentToken) => {
  const sessions = await userRepository.findSessions(userId);
  return sessions
    .map((s) => ({
      id: String(s._id),
      deviceName: s.deviceName,
      deviceType: s.deviceType,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
      isCurrent: Boolean(currentToken) && s.token === currentToken,
    }))
    .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent) || new Date(b.lastUsedAt) - new Date(a.lastUsedAt));
};

// Thu hồi 1 phiên → thiết bị đó mất quyền gia hạn, lần gọi API kế tiếp là bị đá ra.
const revokeSession = async (userId, sessionId) => {
  const sessions = await userRepository.findSessions(userId);
  if (!sessions.some((s) => String(s._id) === String(sessionId))) {
    throw new AppError(MESSAGE.SESSION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  await userRepository.removeSessionById(userId, sessionId);
};

// Thu hồi mọi phiên, giữ lại máy đang thao tác nếu truyền `keepToken`.
const revokeAllSessions = async (userId, keepToken = null) => {
  await userRepository.removeSessions(userId, { keepToken });
};

module.exports = {
  getUserInfo,
  uploadAvatar,
  updateProfile,
  changePassword,
  listSessions,
  revokeSession,
  revokeAllSessions,
};
