const { Notification } = require("../models/notification.model");
const { NOTIFICATION_AUDIENCE } = require("../constants/notification");

// Ghép điều kiện lọc theo đối tượng nhận (admin/client)
const withAudience = (filter, audience) => {
  if (audience === NOTIFICATION_AUDIENCE.ADMIN) {
    return { ...filter, audience: NOTIFICATION_AUDIENCE.ADMIN };
  }
  if (audience === NOTIFICATION_AUDIENCE.CLIENT) {
    return { ...filter, audience: { $ne: NOTIFICATION_AUDIENCE.ADMIN } };
  }
  return filter;
};

// Tạo một thông báo mới
const create = async ({ userId, type, message, audience, eventKey }, { session } = {}) => {
  const data = { userId, type, message, audience, ...(eventKey ? { eventKey } : {}) };
  if (eventKey) {
    return Notification.findOneAndUpdate(
      { eventKey },
      { $setOnInsert: data },
      { new: true, upsert: true, setDefaultsOnInsert: true, session },
    );
  }
  const [notification] = await Notification.create([data], { session });
  return notification;
};

// Một trang thông báo của người dùng, mới nhất trước.
const findByUserIdPage = async ({ userId, page = 1, limit = 10, audience }) => {
  const skip = (Math.max(1, page) - 1) * limit;
  return Notification.find(withAudience({ userId }, audience))
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Đếm tổng số thông báo của người dùng
const countByUserId = async (userId, audience) => {
  return Notification.countDocuments(withAudience({ userId }, audience));
};

// Đếm số thông báo chưa đọc của người dùng
const countUnread = async (userId, audience) => {
  return Notification.countDocuments(withAudience({ userId, read: false }, audience));
};

// Đánh dấu một thông báo là đã đọc
const markAsRead = async (notificationId, userId) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true, readAt: new Date() },
    { new: true }
  ).lean();
};

// Đánh dấu tất cả thông báo là đã đọc
const markAllAsRead = async (userId, audience) => {
  const now = new Date();
  return Notification.updateMany(
    withAudience({ userId, read: false }, audience),
    { read: true, readAt: now }
  );
};

// Xóa toàn bộ thông báo của một người dùng (xóa vĩnh viễn tài khoản)
const deleteByUserId = async (userId) => {
  return Notification.deleteMany({ userId });
};

module.exports = {
  create,
  findByUserIdPage,
  countByUserId,
  countUnread,
  markAsRead,
  markAllAsRead,
  deleteByUserId,
};
