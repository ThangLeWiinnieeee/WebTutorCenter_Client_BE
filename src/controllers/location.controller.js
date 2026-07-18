const locationService = require("../services/location.service");
const { successResponse } = require("../utils/response");
const AppError = require("../utils/AppError");
const MESSAGE = require("../constants/message");

const handleError = require("../utils/handleError");

// Lấy danh sách tỉnh/thành phố
const getProvinces = async (req, res, next) => {
  try {
    const provinces = await locationService.getProvinces();
    return successResponse(res, {
      message: MESSAGE.LOCATION_PROVINCES_SUCCESS,
      data: { provinces },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// Lấy danh sách quận/huyện theo mã tỉnh
const getDistricts = async (req, res, next) => {
  try {
    const provinceCode = Number(req.params.provinceCode);
    if (!provinceCode || isNaN(provinceCode)) {
      throw new AppError(MESSAGE.LOCATION_PROVINCE_CODE_INVALID, 400);
    }
    const districts = await locationService.getDistrictsByProvince(provinceCode);
    return successResponse(res, {
      message: MESSAGE.LOCATION_DISTRICTS_SUCCESS,
      data: { districts },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// Tìm kiếm trường học theo từ khoá
const getSchools = async (req, res, next) => {
  try {
    const { q } = req.query;
    const schools = await locationService.searchSchools(q || "");
    return successResponse(res, {
      message: MESSAGE.LOCATION_SCHOOLS_SUCCESS,
      data: { schools },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

module.exports = {
  getProvinces,
  getDistricts,
  getSchools,
};
