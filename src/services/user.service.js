const userRepository = require("../repositories/user.repository");
const { deleteAvatarFromCloudinary } = require("../utils/upload");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");
const AppError = require("../utils/AppError");
const { UserMapper } = require("../mappers");

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

module.exports = { getUserInfo, uploadAvatar, updateProfile };
