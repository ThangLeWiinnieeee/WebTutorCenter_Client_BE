const Lookup = require("../models/lookup.model");

const lookupRepository = {
  // Lấy toàn bộ giá trị lookup theo loại
  async getByType(type, activeOnly = true) {
    const query = { type };
    if (activeOnly) {
      query.isActive = true;
    }
    return await Lookup.find(query).sort({ order: 1 });
  },

  // Lấy giá trị lookup theo loại (chỉ value/label/parentId)
  async getValuesByType(type, activeOnly = true) {
    const query = { type };
    if (activeOnly) {
      query.isActive = true;
    }
    return await Lookup.find(query, { value: 1, label: 1, parentId: 1 }).sort({ order: 1 });
  },

  // Lấy danh sách quận/huyện theo tỉnh (parentId)
  async getDistrictsByProvince(provinceId, activeOnly = true) {
    const query = {
      type: "district",
      parentId: provinceId,
    };
    if (activeOnly) {
      query.isActive = true;
    }
    return await Lookup.find(query).sort({ order: 1 });
  },

  // Lấy giá trị lookup theo loại và parentId
  async getByTypeAndParent(type, parentId, activeOnly = true) {
    const query = { type, parentId };
    if (activeOnly) {
      query.isActive = true;
    }
    return await Lookup.find(query).sort({ order: 1 });
  },

  // Tạo một giá trị lookup
  async create(data) {
    return await Lookup.create(data);
  },

  // Tạo nhiều giá trị lookup cùng lúc
  async createMany(data) {
    return await Lookup.insertMany(data);
  },

  // Cập nhật một giá trị lookup theo id
  async updateById(id, data) {
    return await Lookup.findByIdAndUpdate(id, data, { new: true });
  },

  // Xoá một giá trị lookup theo id
  async deleteById(id) {
    return await Lookup.findByIdAndDelete(id);
  },

  // Xoá toàn bộ giá trị lookup theo loại
  async deleteByType(type) {
    return await Lookup.deleteMany({ type });
  },

  // Đếm số giá trị lookup theo loại
  async countByType(type) {
    return await Lookup.countDocuments({ type });
  },

  // Lấy toàn bộ dữ liệu lookup gom theo loại
  async getAllGrouped() {
    const lookups = await Lookup.find({ isActive: true }).sort({ type: 1, order: 1 });
    
    const grouped = {};
    lookups.forEach((lookup) => {
      if (!grouped[lookup.type]) {
        grouped[lookup.type] = [];
      }
      grouped[lookup.type].push({
        value: lookup.value,
        label: lookup.label,
        parentId: lookup.parentId,
      });
    });

    return grouped;
  },
};

module.exports = lookupRepository;
