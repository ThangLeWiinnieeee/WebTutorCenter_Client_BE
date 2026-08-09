const locationService = require("../services/location.service");
const { successResponse } = require("../utils/response");
const MESSAGE = require("../constants/message");


// Lấy danh sách tỉnh/thành phố
const getProvinces = async (req, res, next) => {
  try {
    const provinces = await locationService.getProvinces();
    return successResponse(res, {
      message: MESSAGE.LOCATION_PROVINCES_SUCCESS,
      data: { provinces },
    });
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách quận/huyện theo mã tỉnh
const getDistricts = async (req, res, next) => {
  try {
    const districts = await locationService.getDistrictsByProvince(req.params.provinceCode);
    return successResponse(res, {
      message: MESSAGE.LOCATION_DISTRICTS_SUCCESS,
      data: { districts },
    });
  } catch (error) {
    next(error);
  }
};

// Tìm kiếm trường học theo từ khoá
const getSchools = async (req, res, next) => {
  try {
    const schools = await locationService.searchSchools(req.query.q);
    return successResponse(res, {
      message: MESSAGE.LOCATION_SCHOOLS_SUCCESS,
      data: { schools },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProvinces,
  getDistricts,
  getSchools,
};
