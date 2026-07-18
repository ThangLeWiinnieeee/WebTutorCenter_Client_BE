const userService = require("../services/user.service");
const { successResponse } = require("../utils/response");
const AppError = require("../utils/AppError");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");

const handleError = require("../utils/handleError");

// Lấy thông tin tài khoản của người dùng hiện tại
const getUserInfo = async (req, res, next) => {
  try {
    const user = await userService.getUserInfo(req.user.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.USER_INFO_SUCCESS,
      data: { user },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// Tải lên và cập nhật ảnh đại diện
const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError(MESSAGE.UPLOAD_AVATAR_FAILED, HTTP_STATUS.BAD_REQUEST);
    }
    const avatarUrl = req.file.path;
    const user = await userService.uploadAvatar(req.user.id, avatarUrl);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.UPLOAD_AVATAR_SUCCESS,
      data: { user },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// Cập nhật thông tin cá nhân của người dùng
const updateProfile = async (req, res, next) => {
  try {
    const user = await userService.updateProfile(req.user.id, req.body);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.UPDATE_PROFILE_SUCCESS,
      data: { user },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

module.exports = { getUserInfo, uploadAvatar, updateProfile };
