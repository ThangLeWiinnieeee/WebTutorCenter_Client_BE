const tutorAdminService = require("../services/tutorAdmin.service");
const { successResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");


// Lấy số liệu thống kê tổng quan gia sư cho admin
const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await tutorAdminService.getDashboardStats();
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_ADMIN_STATS_SUCCESS,
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách gia sư chờ duyệt
const getPendingTutors = async (req, res, next) => {
  try {
    const result = await tutorAdminService.getPendingTutors(req.query);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_ADMIN_PENDING_SUCCESS,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Duyệt hồ sơ gia sư
const approveTutor = async (req, res, next) => {
  try {
    const tutor = await tutorAdminService.approveTutor(req.params.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_ADMIN_APPROVE_SUCCESS,
      data: { tutor },
    });
  } catch (error) {
    next(error);
  }
};

// Từ chối hồ sơ gia sư
const rejectTutor = async (req, res, next) => {
  try {
    const tutor = await tutorAdminService.rejectTutor(req.params.id, req.body.rejectionReason);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_ADMIN_REJECT_SUCCESS,
      data: { tutor },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getPendingTutors,
  approveTutor,
  rejectTutor,
};
