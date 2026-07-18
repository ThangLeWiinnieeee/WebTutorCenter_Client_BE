const profileChangeAdminService = require("../services/profileChangeAdmin.service");
const { successResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");

const handleError = require("../utils/handleError");

// Lấy danh sách yêu cầu đổi thông tin hồ sơ
const getProfileChanges = async (req, res, next) => {
  try {
    const result = await profileChangeAdminService.getProfileChangeRequests(req.query);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.PROFILE_CHANGE_LIST_SUCCESS,
      data: result,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// Duyệt yêu cầu đổi thông tin hồ sơ
const approveProfileChange = async (req, res, next) => {
  try {
    const request = await profileChangeAdminService.approveProfileChange(req.params.id, req.user.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.PROFILE_CHANGE_APPROVE_SUCCESS,
      data: { request },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// Từ chối yêu cầu đổi thông tin hồ sơ
const rejectProfileChange = async (req, res, next) => {
  try {
    const request = await profileChangeAdminService.rejectProfileChange(req.params.id, req.body.rejectionReason, req.user.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.PROFILE_CHANGE_REJECT_SUCCESS,
      data: { request },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

module.exports = {
  getProfileChanges,
  approveProfileChange,
  rejectProfileChange,
};
