const notificationService = require("../services/notification.service");
const { successResponse } = require("../utils/response");
const ROLES = require("../constants/role");
const { NOTIFICATION_AUDIENCE } = require("../constants/notification");

// Chỉ admin mới được đọc kênh thông báo "admin"; mọi trường hợp khác về kênh "client".
// Ngăn người dùng thường tự đọc thông báo quản trị qua ?audience=admin.
const resolveAudience = (req) => {
  const requested = req.query.audience || req.body?.audience;
  if (requested === NOTIFICATION_AUDIENCE.ADMIN && req.user.role === ROLES.ADMIN) {
    return NOTIFICATION_AUDIENCE.ADMIN;
  }
  return NOTIFICATION_AUDIENCE.CLIENT;
};

const getNotifications = async (req, res, next) => {
  try {
    const audience = resolveAudience(req);
    const result = await notificationService.getUserNotifications(req.user.id, {
      ...req.query,
      audience,
    });
    return successResponse(res, {
      message: "Lấy danh sách thông báo thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user.id);
    return successResponse(res, {
      message: "Đã đánh dấu đã đọc",
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id, resolveAudience(req));
    return successResponse(res, {
      message: "Đã đánh dấu tất cả đã đọc",
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
