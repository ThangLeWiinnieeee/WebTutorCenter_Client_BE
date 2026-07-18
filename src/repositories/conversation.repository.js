const { Conversation } = require("../models/conversation.model");

// Tìm cuộc trò chuyện theo id người dùng (gia sư/học viên)
const findByTutorUserId = async (tutorUserId) => {
  return Conversation.findOne({ tutorUserId }).populate("tutorUserId", "fullName email avatar role").lean();
};

// Lấy một cuộc trò chuyện theo id
const findById = async (id) => {
  return Conversation.findById(id).populate("tutorUserId", "fullName email avatar role").lean();
};

// Tìm hoặc tạo mới cuộc trò chuyện cho gia sư (idempotent, tránh trùng do đua request).
const findOrCreateByTutorUserId = async (tutorUserId) => {
  return Conversation.findOneAndUpdate(
    { tutorUserId },
    { $setOnInsert: { tutorUserId } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )
    .populate("tutorUserId", "fullName email avatar role")
    .lean();
};

// Lấy một trang hội thoại cho admin (mới hoạt động trước, nhận sẵn filter)
const findPageForAdmin = async ({ filter = {}, page = 1, limit = 20 }) => {
  const skip = (Math.max(1, page) - 1) * limit;
  const [items, totalItems] = await Promise.all([
    Conversation.find(filter)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("tutorUserId", "fullName email avatar role")
      .lean(),
    Conversation.countDocuments(filter),
  ]);
  return { items, totalItems };
};

// Cập nhật một cuộc trò chuyện theo id
const updateById = async (id, update) => {
  return Conversation.findByIdAndUpdate(id, update, { new: true })
    .populate("tutorUserId", "fullName email avatar role")
    .lean();
};

// Tổng số tin nhắn admin chưa đọc trên toàn hệ thống (badge cho khu vực admin).
const sumAdminUnread = async () => {
  const [row] = await Conversation.aggregate([
    { $group: { _id: null, total: { $sum: "$adminUnread" } } },
  ]);
  return row?.total || 0;
};

// Xóa hội thoại của một người dùng (xóa vĩnh viễn tài khoản)
const deleteByTutorUserId = async (tutorUserId) => {
  return Conversation.deleteMany({ tutorUserId });
};

module.exports = {
  findByTutorUserId,
  findById,
  findOrCreateByTutorUserId,
  findPageForAdmin,
  updateById,
  sumAdminUnread,
  deleteByTutorUserId,
};
