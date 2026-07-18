const locationRepository = require("../repositories/location.repository");
const AppError = require("../utils/AppError");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");

// Lấy danh sách tỉnh/thành phố
const getProvinces = async () => {
  return await locationRepository.findAllProvinces();
};

// Lấy danh sách quận/huyện theo mã tỉnh
const getDistrictsByProvince = async (provinceCode) => {
  const province = await locationRepository.findProvinceByCode(provinceCode);
  if (!province) {
    throw new AppError(MESSAGE.LOCATION_PROVINCE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  return await locationRepository.findDistrictsByProvinceCode(provinceCode);
};

// Tìm kiếm trường học theo từ khoá
const searchSchools = async (query) => {
  return await locationRepository.searchSchools(query);
};

module.exports = {
  getProvinces,
  getDistrictsByProvince,
  searchSchools,
};
