const notificationService = require("../services/notification.service");
const { successResponse } = require("../utils/response");
const MESSAGE = require("../constants/message");
const ROLES = require("../constants/role");
const { NOTIFICATION_AUDIENCE } = require("../constants/notification");

// Xác định kênh thông báo: chỉ admin được đọc kênh "admin", còn lại về kênh "client"
const resolveAudience = (req) => {
  const requested = req.query.audience || req.body?.audience;
  if (requested === NOTIFICATION_AUDIENCE.ADMIN && req.user.role === ROLES.ADMIN) {
    return NOTIFICATION_AUDIENCE.ADMIN;
  }
  return NOTIFICATION_AUDIENCE.CLIENT;
};

// Lấy danh sách thông báo của người dùng
const getNotifications = async (req, res, next) => {
  try {
    const audience = resolveAudience(req);
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
    await notificationService.markAllAsRead(req.user.id, resolveAudience(req));
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
