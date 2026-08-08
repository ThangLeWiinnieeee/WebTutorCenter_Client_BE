const Promo = require("../models/promo.model");

// Chuẩn hoá mã (viết hoa, bỏ khoảng trắng)
const normalizeCode = (code) => String(code || "").toUpperCase().trim();

// Tạo một mã giảm giá mới
const create = async (data, { session } = {}) => {
  const [promo] = await Promo.create([data], { session });
  return promo;
};

// Chỉ lấy mã chưa bị xóa mềm (dùng cho CRUD/áp dụng thông thường)
const findById = (id) => Promo.findOne({ _id: id, deletedAt: null });

// Tìm theo mã, xét cả mã đã xóa mềm — phục vụ kiểm tra trùng mã + đánh giá áp dụng
const findByCode = (code) => Promo.findOne({ code: normalizeCode(code) });

// Lấy danh sách mã (loại mã đã xoá mềm, có phân trang)
const findMany = async (filter, { page, limit }) => {
  const skip = (page - 1) * limit;
  const queryFilter = { deletedAt: null, ...filter };
  const [items, totalItems] = await Promise.all([
    Promo.find(queryFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Promo.countDocuments(queryFilter),
  ]);
  return { items, totalItems };
};

// Cập nhật một mã (chỉ mã chưa xoá mềm)
const updateById = (id, data) =>
  Promo.findOneAndUpdate({ _id: id, deletedAt: null }, data, { new: true, runValidators: true });

// Xóa mềm: đưa mã vào thùng rác
const softDelete = (id, adminUserId) =>
  Promo.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { deletedAt: new Date(), deletedBy: adminUserId },
    { new: true },
  );

// Khôi phục mã khỏi thùng rác
const restore = (id) =>
  Promo.findOneAndUpdate(
    { _id: id, deletedAt: { $ne: null } },
    { deletedAt: null, deletedBy: null },
    { new: true },
  );

// Danh sách mã trong thùng rác
const findDeleted = async ({ page, limit }) => {
  const skip = (page - 1) * limit;
  const filter = { deletedAt: { $ne: null } };
  const [items, totalItems] = await Promise.all([
    Promo.find(filter).sort({ deletedAt: -1 }).skip(skip).limit(limit).lean(),
    Promo.countDocuments(filter),
  ]);
  return { items, totalItems };
};

// Xóa vĩnh viễn (hard delete) — chỉ áp dụng cho mã đang ở thùng rác
const deleteById = (id) => Promo.findOneAndDelete({ _id: id, deletedAt: { $ne: null } });

// Xoá vĩnh viễn toàn bộ voucher cá nhân của một user (không đụng mã toàn cục)
const deleteByOwnerUserId = (ownerUserId) => Promo.deleteMany({ ownerUserId });

// Tăng số lượt đã dùng của mã
const incrementUsed = (id, { session, expectedUpdatedAt } = {}) =>
  Promo.findOneAndUpdate(
    {
      _id: id,
      deletedAt: null,
      isActive: true,
      ...(expectedUpdatedAt ? { updatedAt: expectedUpdatedAt } : {}),
      $and: [
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
      ],
      $expr: {
        $or: [
          { $eq: ["$usageLimit", null] },
          { $lt: [{ $ifNull: ["$usedCount", 0] }, "$usageLimit"] },
        ],
      },
    },
    { $inc: { usedCount: 1 } },
    { new: true, session },
  );

// Voucher cá nhân của một user (kho mã), mới nhất trước
const findByOwner = async (ownerUserId, { page = 1, limit = 10 }) => {
  const skip = (Math.max(1, page) - 1) * limit;
  const filter = { ownerUserId, deletedAt: null };
  const [items, totalItems] = await Promise.all([
    Promo.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Promo.countDocuments(filter),
  ]);
  return { items, totalItems };
};

module.exports = {
  create,
  findById,
  findByCode,
  findMany,
  findByOwner,
  updateById,
  softDelete,
  restore,
  findDeleted,
  deleteById,
  deleteByOwnerUserId,
  incrementUsed,
};
