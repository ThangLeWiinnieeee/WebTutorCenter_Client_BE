const lookupRepository = require("../repositories/lookup.repository");
const AppError = require("../utils/AppError");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");
const { LookupMapper } = require("../mappers");

const translateDuplicateError = (error) => {
  if (error?.code === 11000) {
    throw new AppError(MESSAGE.LOOKUP_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
  }
  throw error;
};

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
    const lookups = await lookupRepository.findAllActive();
    return lookups.reduce((grouped, lookup) => {
      const dto = LookupMapper.toDTO(lookup);
      grouped[dto.type] ||= [];
      grouped[dto.type].push({ value: dto.value, label: dto.label, parentId: dto.parentId });
      return grouped;
    }, {});
  },

  // Tạo một giá trị lookup (admin)
  async createLookup(data) {
    try {
      return LookupMapper.toDTO(await lookupRepository.create(data));
    } catch (error) {
      return translateDuplicateError(error);
    }
  },

  // Tạo nhiều giá trị lookup cùng lúc (admin)
  async createManyLookups(data) {
    try {
      return LookupMapper.toDTOs(await lookupRepository.createMany(data));
    } catch (error) {
      return translateDuplicateError(error);
    }
  },

  // Cập nhật một giá trị lookup (admin)
  async updateLookup(id, data) {
    try {
      const lookup = await lookupRepository.updateById(id, data);
      if (!lookup) throw new AppError(MESSAGE.LOOKUP_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      return LookupMapper.toDTO(lookup);
    } catch (error) {
      return translateDuplicateError(error);
    }
  },

  // Xoá một giá trị lookup (admin)
  async deleteLookup(id) {
    const lookup = await lookupRepository.deleteById(id);
    if (!lookup) throw new AppError(MESSAGE.LOOKUP_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    return LookupMapper.toDTO(lookup);
  },

  // Xoá toàn bộ giá trị lookup theo loại (admin)
  async deleteByType(type) {
    return await lookupRepository.deleteByType(type);
  },
};

module.exports = lookupService;
