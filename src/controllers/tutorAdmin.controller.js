const tutorAdminService = require("../services/tutorAdmin.service");
const { successResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");

const handleError = require("../utils/handleError");

const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await tutorAdminService.getDashboardStats();
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_ADMIN_STATS_SUCCESS,
      data: { stats },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const getPendingTutors = async (req, res, next) => {
  try {
    const result = await tutorAdminService.getPendingTutors(req.query);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_ADMIN_PENDING_SUCCESS,
      data: result,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const approveTutor = async (req, res, next) => {
  try {
    const tutor = await tutorAdminService.approveTutor(req.params.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_ADMIN_APPROVE_SUCCESS,
      data: { tutor },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const rejectTutor = async (req, res, next) => {
  try {
    const tutor = await tutorAdminService.rejectTutor(req.params.id, req.body.rejectionReason);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_ADMIN_REJECT_SUCCESS,
      data: { tutor },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

module.exports = {
  getDashboardStats,
  getPendingTutors,
  approveTutor,
  rejectTutor,
};
