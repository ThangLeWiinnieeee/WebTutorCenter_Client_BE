const Subject = require("../models/subject.model");
const {
  escapeRegExp,
  buildDiacriticInsensitivePattern,
} = require("../utils/search");

// Lấy danh sách môn học (lọc theo trạng thái bật + từ khoá)
const findAll = async ({ activeOnly = false, keyword = "" } = {}, { session } = {}) => {
  const filter = {};
  if (activeOnly) filter.isActive = true;
  // Tìm theo từ khóa: khớp không dấu + không phân biệt hoa/thường
  if (keyword) filter.name = { $regex: buildDiacriticInsensitivePattern(keyword), $options: "i" };
  return await Subject.find(filter).sort({ order: 1, name: 1 }).session(session || null);
};

// Tìm một môn học theo id
const findById = async (id, { session } = {}) => {
  return await Subject.findById(id).session(session || null);
};

// Kiểm tra tên môn đã tồn tại chưa (không phân biệt hoa/thường)
const existsByName = async (name, exceptId = null, { session } = {}) => {
  const filter = { name: { $regex: `^${escapeRegExp(String(name).trim())}$`, $options: "i" } };
  if (exceptId) filter._id = { $ne: exceptId };
  return await Subject.exists(filter).session(session || null);
};

// Tạo một môn học mới
const create = async (data, { session } = {}) => {
  if (!session) return await Subject.create(data);
  const [subject] = await Subject.create([data], { session });
  return subject;
};

// Cập nhật một môn học theo id
const updateById = async (id, data, { session } = {}) => {
  return await Subject.findByIdAndUpdate(id, data, { new: true, runValidators: true, session });
};

// Lấy giá trị thứ tự lớn nhất hiện có
const maxOrder = async ({ session } = {}) => {
  const top = await Subject.findOne().sort({ order: -1 }).select("order").session(session || null);
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
