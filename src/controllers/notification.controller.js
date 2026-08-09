const notificationService = require("../services/notification.service");
const { successResponse } = require("../utils/response");
const MESSAGE = require("../constants/message");

const getAudience = (req) =>
  notificationService.resolveAudience(req.query.audience || req.body?.audience, req.user.role);

// Lấy danh sách thông báo của người dùng
const getNotifications = async (req, res, next) => {
  try {
    const audience = getAudience(req);
    const result = await notificationService.getUserNotifications(req.user.id, {
      ...req.query,
      audience,
    });
    return successResponse(res, {
      message: MESSAGE.NOTIFICATION_LIST_SUCCESS,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Đánh dấu một thông báo là đã đọc
const markAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user.id);
    return successResponse(res, {
      message: MESSAGE.NOTIFICATION_MARK_READ_SUCCESS,
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
};

// Đánh dấu tất cả thông báo là đã đọc
const markAllAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id, getAudience(req));
    return successResponse(res, {
      message: MESSAGE.NOTIFICATION_MARK_ALL_READ_SUCCESS,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
