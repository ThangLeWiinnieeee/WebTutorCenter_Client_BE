const userService = require("../services/user.service");
const { successResponse } = require("../utils/response");
const AppError = require("../utils/AppError");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");
const { REFRESH_TOKEN_CLEAR_OPTIONS, readRefreshToken } = require("../utils/token");

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

const changePassword = async (req, res, next) => {
  try {
    await userService.changePassword(req.user.id, req.body);
    // Chọn thu hồi hết thì máy này cũng mất phiên → dọn cookie refresh của web.
    if (req.body.revokeOtherSessions) {
      res.clearCookie("refreshToken", REFRESH_TOKEN_CLEAR_OPTIONS);
    }

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.CHANGE_PASSWORD_SUCCESS,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// Danh sách thiết bị đang đăng nhập
const getSessions = async (req, res, next) => {
  try {
    const sessions = await userService.listSessions(req.user.id, readRefreshToken(req));
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.SESSION_LIST_SUCCESS,
      data: { sessions },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// Đăng xuất một thiết bị cụ thể trong danh sách
const revokeSession = async (req, res, next) => {
  try {
    await userService.revokeSession(req.user.id, req.params.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.SESSION_REVOKED,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// Đăng xuất khỏi TẤT CẢ thiết bị, kể cả máy đang gọi.
const revokeAllSessions = async (req, res, next) => {
  try {
    await userService.revokeAllSessions(req.user.id);
    res.clearCookie("refreshToken", REFRESH_TOKEN_CLEAR_OPTIONS);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.SESSIONS_REVOKED,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

module.exports = {
  getUserInfo,
  uploadAvatar,
  updateProfile,
  changePassword,
  getSessions,
  revokeSession,
  revokeAllSessions,
};
