const cancellationAdminService = require("../services/cancellationAdmin.service");
const { successResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");

const handleError = require("../utils/handleError");

const getApplicationCancellations = async (req, res, next) => {
  try {
    const result = await cancellationAdminService.getApplicationCancellations(req.query);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.CLASS_APPLICATION_CANCELLATION_LIST_SUCCESS,
      data: result,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const approveCancellation = async (req, res, next) => {
  try {
    const application = await cancellationAdminService.approveCancellation(req.params.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.CLASS_APPLICATION_CANCEL_APPROVE_SUCCESS,
      data: { application },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const rejectCancellation = async (req, res, next) => {
  try {
    const application = await cancellationAdminService.rejectCancellation(req.params.id, req.body.rejectionReason);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.CLASS_APPLICATION_CANCEL_REJECT_SUCCESS,
      data: { application },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

module.exports = {
  getApplicationCancellations,
  approveCancellation,
  rejectCancellation,
};
