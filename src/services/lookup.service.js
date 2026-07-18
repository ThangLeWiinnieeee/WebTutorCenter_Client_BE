const lookupRepository = require("../repositories/lookup.repository");

const lookupService = {
  // Lấy danh sách giá trị lookup theo loại (public)
  async getByType(type) {
    const values = await lookupRepository.getValuesByType(type, true);
    if (values.length === 0) {
      // Thiếu dữ liệu lookup là lỗi cấu hình/seed phía hệ thống (không phải người dùng thao tác sai)
      // → ném lỗi thường để error middleware ghi log ở terminal BE và KHÔNG hiển thị ra FE.
      throw new Error(`Không tìm thấy dữ liệu lookup cho: ${type}`);
    }
    return values.map((v) => ({
      value: v.value,
      label: v.label,
      parentId: v.parentId || undefined,
    }));
  },

  // Lấy danh sách quận/huyện theo tỉnh (public)
  async getDistrictsByProvince(provinceValue) {
    const districts = await lookupRepository.getDistrictsByProvince(provinceValue, true);
    if (districts.length === 0) {
      // Thiếu dữ liệu quận/huyện là lỗi cấu hình/seed phía hệ thống → log ở terminal BE, không đẩy ra FE.
      throw new Error(`Không tìm thấy quận/huyện cho: ${provinceValue}`);
    }
    return districts.map((d) => ({
      value: d.value,
      label: d.label,
    }));
  },

  // Lấy toàn bộ dữ liệu lookup gom theo nhóm
  async getAllGrouped() {
    return await lookupRepository.getAllGrouped();
  },

  // Tạo một giá trị lookup (admin)
  async createLookup(data) {
    return await lookupRepository.create(data);
  },

  // Tạo nhiều giá trị lookup cùng lúc (admin)
  async createManyLookups(data) {
    return await lookupRepository.createMany(data);
  },

  // Cập nhật một giá trị lookup (admin)
  async updateLookup(id, data) {
    return await lookupRepository.updateById(id, data);
  },

  // Xoá một giá trị lookup (admin)
  async deleteLookup(id) {
    return await lookupRepository.deleteById(id);
  },

  // Xoá toàn bộ giá trị lookup theo loại (admin)
  async deleteByType(type) {
    return await lookupRepository.deleteByType(type);
  },
};

module.exports = lookupService;
