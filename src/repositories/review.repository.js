const mongoose = require("mongoose");
const Review = require("../models/review.model");

const REVIEWER_FIELDS = "fullName avatar";
const TUTOR_USER_FIELDS = "fullName avatar";

// Tạo một đánh giá mới
const create = async (data) => {
  const doc = new Review(data);
  return await doc.save();
};

// Tìm một đánh giá theo id
const findById = async (id) => Review.findById(id);

// Đánh giá còn hiệu lực (chưa xóa mềm) của một lớp do một người đăng viết — chặn đánh giá trùng
const findActiveByClassAndReviewer = async (classId, reviewerId) =>
  Review.findOne({ classId, reviewerId, deletedAt: null });

// Một trang đánh giá còn hiệu lực của một gia sư (mới nhất trước) — dùng cho trang chi tiết gia sư
const findActiveByTutorId = async (tutorId, { page = 1, limit = 5 } = {}) => {
  const skip = (Math.max(1, page) - 1) * limit;
  const filter = { tutorId, deletedAt: null };
  const [items, totalItems] = await Promise.all([
    Review.find(filter)
      .populate("reviewerId", REVIEWER_FIELDS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);
  return { items, totalItems };
};

// Đánh giá còn hiệu lực của một gia sư kèm thông tin lớp — dùng cho khu vực admin
const findActiveByTutorIdForAdmin = async (tutorId, { page = 1, limit = 10 } = {}) => {
  const skip = (Math.max(1, page) - 1) * limit;
  const filter = { tutorId, deletedAt: null };
  const [items, totalItems] = await Promise.all([
    Review.find(filter)
      .populate("reviewerId", REVIEWER_FIELDS)
      .populate("classId", "classCode subject")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);
  return { items, totalItems };
};

// Tổng số sao + số lượt của đánh giá còn hiệu lực của một gia sư — để tính lại điểm trung bình
const aggregateActiveByTutor = async (tutorId) => {
  const rows = await Review.aggregate([
    { $match: { tutorId: new mongoose.Types.ObjectId(String(tutorId)), deletedAt: null } },
    { $group: { _id: "$tutorId", sum: { $sum: "$rating" }, count: { $sum: 1 } } },
  ]);
  return rows[0] ? { sum: rows[0].sum, count: rows[0].count } : { sum: 0, count: 0 };
};

// Danh sách classId mà người đăng đã đánh giá (còn hiệu lực) — để gắn cờ "đã đánh giá" cho bài đăng
const findReviewedClassIds = async (reviewerId, classIds = []) => {
  if (!classIds.length) return [];
  return await Review.distinct("classId", {
    reviewerId,
    classId: { $in: classIds },
    deletedAt: null,
  });
};

// Gia sư phản hồi đánh giá (guard reply:null để không phản hồi đúp khi có race)
const setReply = async (id, reply) =>
  Review.findOneAndUpdate(
    { _id: id, deletedAt: null, reply: null },
    { reply },
    { new: true }
  );

// Xóa mềm: đưa đánh giá vào thùng rác
const softDelete = async (id, adminUserId) =>
  Review.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { deletedAt: new Date(), deletedBy: adminUserId },
    { new: true }
  );

// Khôi phục đánh giá khỏi thùng rác
const restore = async (id) =>
  Review.findOneAndUpdate(
    { _id: id, deletedAt: { $ne: null } },
    { deletedAt: null, deletedBy: null },
    { new: true }
  );

// Danh sách đánh giá trong thùng rác (đã xóa mềm) — kèm gia sư, người đánh giá, lớp
const findDeleted = async ({ page = 1, limit = 10 } = {}) => {
  const skip = (Math.max(1, page) - 1) * limit;
  const filter = { deletedAt: { $ne: null } };
  const [items, totalItems] = await Promise.all([
    Review.find(filter)
      .populate("reviewerId", REVIEWER_FIELDS)
      .populate({ path: "tutorId", populate: { path: "userId", select: TUTOR_USER_FIELDS } })
      .populate("classId", "classCode subject")
      .sort({ deletedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);
  return { items, totalItems };
};

// Xóa vĩnh viễn (hard delete) — chỉ áp dụng cho đánh giá đang ở thùng rác
const deleteById = async (id) =>
  Review.findOneAndDelete({ _id: id, deletedAt: { $ne: null } });

// Xóa toàn bộ đánh giá VỀ một gia sư (xóa vĩnh viễn tài khoản gia sư)
const deleteByTutorId = async (tutorId) => Review.deleteMany({ tutorId });

// Xóa toàn bộ đánh giá DO một người dùng viết (xóa vĩnh viễn tài khoản người đăng)
const deleteByReviewerId = async (reviewerId) => Review.deleteMany({ reviewerId });

module.exports = {
  create,
  findById,
  findActiveByClassAndReviewer,
  findActiveByTutorId,
  findActiveByTutorIdForAdmin,
  aggregateActiveByTutor,
  findReviewedClassIds,
  setReply,
  softDelete,
  restore,
  findDeleted,
  deleteById,
  deleteByTutorId,
  deleteByReviewerId,
};
