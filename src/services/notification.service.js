const notificationRepository = require("../repositories/notification.repository");
const AppError = require("../utils/AppError");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");
const { NotificationMapper } = require("../mappers");
const { buildPagination } = require("../utils/pagination");
const ROLES = require("../constants/role");
const { NOTIFICATION_AUDIENCE } = require("../constants/notification");

const resolveAudience = (requestedAudience, role) => {
  if (requestedAudience === NOTIFICATION_AUDIENCE.ADMIN && role === ROLES.ADMIN) {
    return NOTIFICATION_AUDIENCE.ADMIN;
  }
  return NOTIFICATION_AUDIENCE.CLIENT;
};

// Tạo một thông báo mới cho người dùng (audience mặc định là CLIENT)
const createNotification = async ({ userId, type, message, audience, eventKey }, options = {}) => {
  const notification = await notificationRepository.create(
    { userId, type, message, audience, eventKey },
    options,
  );
  return NotificationMapper.toDTO(notification);
};

// Lấy danh sách thông báo của người dùng kèm phân trang và số chưa đọc
const getUserNotifications = async (userId, query = {}) => {
  const { page = 1, limit = 10, audience } = query;

  const [docs, totalItems, unreadCount] = await Promise.all([
    notificationRepository.findByUserIdPage({ userId, page, limit, audience }),
    notificationRepository.countByUserId(userId, audience),
    notificationRepository.countUnread(userId, audience),
  ]);

  return {
    notifications: NotificationMapper.toDTOList(docs),
    unreadCount,
    pagination: buildPagination({ page, limit, totalItems }),
  };
};

// Đánh dấu một thông báo là đã đọc
const markAsRead = async (notificationId, userId) => {
  const notification = await notificationRepository.markAsRead(notificationId, userId);
  if (!notification) {
    throw new AppError(MESSAGE.NOTIFICATION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  return NotificationMapper.toDTO(notification);
};

// Đánh dấu tất cả thông báo là đã đọc
const markAllAsRead = async (userId, audience) => {
  await notificationRepository.markAllAsRead(userId, audience);
};

module.exports = {
  resolveAudience,
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
};
