const { Province, District, School } = require("../models/location.model");

// Lấy tất cả tỉnh/thành (sắp theo tên)
const findAllProvinces = async () => {
  return await Province.find({}).sort({ name: 1 }).lean();
};

// Lấy danh sách quận/huyện theo mã tỉnh
const findDistrictsByProvinceCode = async (provinceCode) => {
  return await District.find({ provinceCode }).sort({ name: 1 }).lean();
};

// Tìm tỉnh/thành theo mã
const findProvinceByCode = async (code) => {
  return await Province.findOne({ code }).lean();
};

// Tìm quận/huyện theo mã
const findDistrictByCode = async (code) => {
  return await District.findOne({ code }).lean();
};

// Ghi hàng loạt (upsert) danh sách tỉnh/thành
const bulkUpsertProvinces = async (provinces) => {
  const ops = provinces.map((p) => ({
    updateOne: {
      filter: { code: p.code },
      update: { $set: p },
      upsert: true,
    },
  }));
  return await Province.bulkWrite(ops);
};

// Ghi hàng loạt (upsert) danh sách quận/huyện
const bulkUpsertDistricts = async (districts) => {
  const ops = districts.map((d) => ({
    updateOne: {
      filter: { code: d.code },
      update: { $set: d },
      upsert: true,
    },
  }));
  return await District.bulkWrite(ops);
};

// Bỏ dấu tiếng Việt trong chuỗi
const removeVietnameseTones = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

// Escape ký tự đặc biệt cho biểu thức chính quy
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Tìm kiếm trường học theo từ khoá (khớp cả có dấu lẫn không dấu)
const searchSchools = async (query, limit = 20) => {
  if (!query || !query.trim()) {
    return await School.find({}).sort({ name: 1 }).limit(limit).lean();
  }

  const trimmed = query.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const queryNoTone = removeVietnameseTones(trimmed);
  const wordsNoTone = queryNoTone.split(/\s+/).filter(Boolean);

  const nameConditions = words.map((w) => ({
    name: { $regex: escapeRegex(w), $options: "i" },
  }));

  const nameSearchConditions = wordsNoTone.map((w) => ({
    nameSearch: { $regex: escapeRegex(w), $options: "i" },
  }));

  const filter = {
    $or: [{ $and: nameConditions }, { $and: nameSearchConditions }],
  };

  return await School.find(filter).sort({ name: 1 }).limit(limit).lean();
};

// Ghi hàng loạt (upsert) danh sách trường học
const bulkUpsertSchools = async (schools) => {
  const ops = schools.map((s) => ({
    updateOne: {
      filter: { name: s.name },
      update: { $set: { ...s, nameSearch: removeVietnameseTones(s.name) } },
      upsert: true,
    },
  }));
  return await School.bulkWrite(ops);
};

module.exports = {
  findAllProvinces,
  findDistrictsByProvinceCode,
  findProvinceByCode,
  findDistrictByCode,
  bulkUpsertProvinces,
  bulkUpsertDistricts,
  searchSchools,
  bulkUpsertSchools,
};
