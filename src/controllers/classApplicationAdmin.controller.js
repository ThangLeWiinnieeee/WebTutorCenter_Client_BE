const classApplicationAdminService = require("../services/classApplicationAdmin.service");
const { successResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");


// Lấy danh sách đơn nhận lớp cho admin
const getClassApplications = async (req, res, next) => {
  try {
    const result = await classApplicationAdminService.getClassApplications(req.query);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.CLASS_APPLICATION_LIST_SUCCESS,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Lấy thống kê đơn nhận lớp
const getClassApplicationStats = async (req, res, next) => {
  try {
    const stats = await classApplicationAdminService.getClassApplicationStats(req.query);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.CLASS_APPLICATION_STATS_SUCCESS,
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};

// Duyệt đơn nhận lớp
const approveClassApplication = async (req, res, next) => {
  try {
    const application = await classApplicationAdminService.approveClassApplication(req.params.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.CLASS_APPLICATION_APPROVE_SUCCESS,
      data: { application },
    });
  } catch (error) {
    next(error);
  }
};

// Từ chối đơn nhận lớp
const rejectClassApplication = async (req, res, next) => {
  try {
    const application = await classApplicationAdminService.rejectClassApplication(req.params.id, req.body.rejectionReason);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.CLASS_APPLICATION_REJECT_SUCCESS,
      data: { application },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClassApplications,
  getClassApplicationStats,
  approveClassApplication,
  rejectClassApplication,
};
