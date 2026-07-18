const statsAdminService = require("../services/statsAdmin.service");
const { successResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");
const handleError = require("../utils/handleError");

// Lấy số liệu thống kê tổng quan cho admin
const getSummary = async (req, res, next) => {
  try {
    const stats = await statsAdminService.getSummary();
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.STATS_SUMMARY_SUCCESS,
      data: { stats },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

module.exports = { getSummary };
