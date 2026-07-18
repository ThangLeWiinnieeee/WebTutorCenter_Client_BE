const { Message } = require("../models/message.model");

// Tạo một tin nhắn mới
const create = async ({ conversationId, senderId, senderRole, content, imageUrl = null, card = null }) => {
  return Message.create({ conversationId, senderId, senderRole, content, imageUrl, card });
};

// Lấy một trang tin nhắn của hội thoại (sắp theo thời gian tăng dần)
const findByConversationPage = async ({ conversationId, page = 1, limit = 30 }) => {
  const skip = (Math.max(1, page) - 1) * limit;
  const docs = await Message.find({ conversationId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  return docs.reverse();
};

// Đếm số tin nhắn của một hội thoại
const countByConversation = async (conversationId) => {
  return Message.countDocuments({ conversationId });
};

// Xóa toàn bộ tin nhắn của một hội thoại (xóa vĩnh viễn tài khoản)
const deleteByConversationId = async (conversationId) => {
  return Message.deleteMany({ conversationId });
};

// Xóa toàn bộ tin nhắn do một người dùng gửi (kể cả nằm ở hội thoại khác, vd admin)
const deleteBySenderId = async (senderId) => {
  return Message.deleteMany({ senderId });
};

// Gom URL ảnh (Cloudinary) của mọi tin nhắn trong một hội thoại — để dọn ảnh
// khi xóa vĩnh viễn tài khoản.
const findImageUrlsByConversationId = async (conversationId) => {
  const docs = await Message.find({ conversationId, imageUrl: { $ne: null } })
    .select("imageUrl")
    .lean();
  return docs.map((doc) => doc.imageUrl).filter(Boolean);
};

// Gom URL ảnh của mọi tin nhắn do một người dùng gửi (kể cả ở hội thoại khác, vd admin).
const findImageUrlsBySenderId = async (senderId) => {
  const docs = await Message.find({ senderId, imageUrl: { $ne: null } })
    .select("imageUrl")
    .lean();
  return docs.map((doc) => doc.imageUrl).filter(Boolean);
};

module.exports = {
  create,
  findByConversationPage,
  countByConversation,
  deleteByConversationId,
  deleteBySenderId,
  findImageUrlsByConversationId,
  findImageUrlsBySenderId,
};
