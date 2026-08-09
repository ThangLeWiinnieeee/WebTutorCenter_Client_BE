const userAdminService = require("../services/userAdmin.service");
const { successResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");


// Lấy danh sách người dùng cho admin
const getAdminUsers = async (req, res, next) => {
  try {
    const data = await userAdminService.getAdminUsers(req.query);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.ADMIN_LIST_USERS_SUCCESS,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Cập nhật thông tin người dùng (admin)
const updateAdminUser = async (req, res, next) => {
  try {
    const user = await userAdminService.updateAdminUser(req.user.id, req.params.id, req.body);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.ADMIN_UPDATE_USER_SUCCESS,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// Bật/tắt trạng thái hoạt động của tài khoản người dùng
const updateAdminUserStatus = async (req, res, next) => {
  try {
    const user = await userAdminService.updateAdminUserStatus(req.user.id, req.params.id, req.body.isActive);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.ADMIN_UPDATE_USER_STATUS_SUCCESS,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// Xoá mềm tài khoản người dùng
const softDeleteAdminUser = async (req, res, next) => {
  try {
    const user = await userAdminService.softDeleteAdminUser(req.user.id, req.params.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.ADMIN_DELETE_USER_SUCCESS,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminUsers,
  updateAdminUser,
  updateAdminUserStatus,
  softDeleteAdminUser,
};
