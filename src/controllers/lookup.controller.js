const lookupService = require("../services/lookup.service");
const { successResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");

const handleError = require("../utils/handleError");

const lookupController = {
  // Lấy danh sách giá trị lookup theo loại (public)
  async getByType(req, res, next) {
    try {
      const { type } = req.params;
      const values = await lookupService.getByType(type);
      return successResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGE.LOOKUP_LIST_SUCCESS,
        data: { values },
      });
    } catch (error) {
      handleError(error, res, next);
    }
  },

  // Lấy danh sách quận/huyện theo tỉnh (public)
  async getDistrictsByProvince(req, res, next) {
    try {
      const { province } = req.params;
      const districts = await lookupService.getDistrictsByProvince(province);
      return successResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGE.LOCATION_DISTRICTS_SUCCESS,
        data: { districts },
      });
    } catch (error) {
      handleError(error, res, next);
    }
  },

  // Lấy toàn bộ dữ liệu lookup gom theo nhóm
  async getAllGrouped(req, res, next) {
    try {
      const data = await lookupService.getAllGrouped();
      return successResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGE.LOOKUP_ALL_SUCCESS,
        data,
      });
    } catch (error) {
      handleError(error, res, next);
    }
  },

  // Tạo một giá trị lookup (admin)
  async createLookup(req, res, next) {
    try {
      const lookup = await lookupService.createLookup(req.body);
      return successResponse(res, {
        statusCode: HTTP_STATUS.CREATED,
        message: MESSAGE.LOOKUP_CREATE_SUCCESS,
        data: { lookup },
      });
    } catch (error) {
      handleError(error, res, next);
    }
  },

  // Tạo nhiều giá trị lookup cùng lúc (admin)
  async createManyLookups(req, res, next) {
    try {
      const { lookups } = req.body;
      const created = await lookupService.createManyLookups(lookups);
      return successResponse(res, {
        statusCode: HTTP_STATUS.CREATED,
        message: `Tạo ${created.length} lookup thành công`,
        data: { count: created.length },
      });
    } catch (error) {
      handleError(error, res, next);
    }
  },

  // Cập nhật một giá trị lookup (admin)
  async updateLookup(req, res, next) {
    try {
      const { id } = req.params;
      const lookup = await lookupService.updateLookup(id, req.body);
      return successResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGE.LOOKUP_UPDATE_SUCCESS,
        data: { lookup },
      });
    } catch (error) {
      handleError(error, res, next);
    }
  },

  // Xoá một giá trị lookup (admin)
  async deleteLookup(req, res, next) {
    try {
      const { id } = req.params;
      await lookupService.deleteLookup(id);
      return successResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGE.LOOKUP_DELETE_SUCCESS,
      });
    } catch (error) {
      handleError(error, res, next);
    }
  },

  // Xoá toàn bộ giá trị lookup theo loại (admin)
  async deleteByType(req, res, next) {
    try {
      const { type } = req.params;
      await lookupService.deleteByType(type);
      return successResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: `Xóa tất cả lookup type ${type} thành công`,
      });
    } catch (error) {
      handleError(error, res, next);
    }
  },
};

module.exports = lookupController;
