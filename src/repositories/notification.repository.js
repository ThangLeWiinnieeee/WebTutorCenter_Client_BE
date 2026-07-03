const { Notification } = require("../models/notification.model");
const { NOTIFICATION_AUDIENCE } = require("../constants/notification");

// Ghép điều kiện lọc theo đối tượng nhận (audience).
// - "admin": chỉ thông báo được gắn nhãn admin.
// - "client" (mặc định): mọi thông báo KHÔNG phải admin, gồm cả tài liệu cũ chưa có
//   field audience ($ne "admin" khớp cả giá trị "client" lẫn field thiếu) → không mất dữ liệu cũ.
const withAudience = (filter, audience) => {
  if (audience === NOTIFICATION_AUDIENCE.ADMIN) {
    return { ...filter, audience: NOTIFICATION_AUDIENCE.ADMIN };
  }
  if (audience === NOTIFICATION_AUDIENCE.CLIENT) {
    return { ...filter, audience: { $ne: NOTIFICATION_AUDIENCE.ADMIN } };
  }
  return filter;
};

const create = async ({ userId, type, message, audience }) => {
  return Notification.create({ userId, type, message, audience });
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

const countByUserId = async (userId, audience) => {
  return Notification.countDocuments(withAudience({ userId }, audience));
};

const countUnread = async (userId, audience) => {
  return Notification.countDocuments(withAudience({ userId, read: false }, audience));
};

const markAsRead = async (notificationId, userId) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true, readAt: new Date() },
    { new: true }
  ).lean();
};

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
