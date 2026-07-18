const Subject = require("../models/subject.model");
const {
  escapeRegExp,
  buildDiacriticInsensitivePattern,
} = require("../utils/search");

// Lấy danh sách môn học (lọc theo trạng thái bật + từ khoá)
const findAll = async ({ activeOnly = false, keyword = "" } = {}) => {
  const filter = {};
  if (activeOnly) filter.isActive = true;
  // Tìm theo từ khóa: khớp không dấu + không phân biệt hoa/thường
  if (keyword) filter.name = { $regex: buildDiacriticInsensitivePattern(keyword), $options: "i" };
  return await Subject.find(filter).sort({ order: 1, name: 1 });
};

// Tìm một môn học theo id
const findById = async (id) => {
  return await Subject.findById(id);
};

// Kiểm tra tên môn đã tồn tại chưa (không phân biệt hoa/thường)
const existsByName = async (name, exceptId = null) => {
  const filter = { name: { $regex: `^${escapeRegExp(String(name).trim())}$`, $options: "i" } };
  if (exceptId) filter._id = { $ne: exceptId };
  return await Subject.exists(filter);
};

// Tạo một môn học mới
const create = async (data) => {
  return await Subject.create(data);
};

// Cập nhật một môn học theo id
const updateById = async (id, data) => {
  return await Subject.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

// Lấy giá trị thứ tự lớn nhất hiện có
const maxOrder = async () => {
  const top = await Subject.findOne().sort({ order: -1 }).select("order");
  return top?.order ?? 0;
};

module.exports = {
  findAll,
  findById,
  existsByName,
  create,
  updateById,
  maxOrder,
};
