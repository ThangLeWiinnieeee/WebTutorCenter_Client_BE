const classApplicationService = require("../services/class.application.service");
const { successResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");

const handleError = require("../utils/handleError");

const applyForClass = async (req, res, next) => {
  try {
    const application = await classApplicationService.applyForClass(req.user.id, req.params.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: MESSAGE.CLASS_APPLICATION_APPLY_SUCCESS,
      data: { application },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const getMyApplications = async (req, res, next) => {
  try {
    const result = await classApplicationService.getMyApplications(req.user.id, req.query);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.CLASS_APPLICATION_LIST_SUCCESS,
      data: result,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// Người đăng: danh sách gia sư ứng tuyển bài đăng của mình
const getApplicants = async (req, res, next) => {
  try {
    const result = await classApplicationService.getApplicantsForPoster(req.user.id, req.params.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.CLASS_APPLICANTS_LIST_SUCCESS,
      data: result,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// Người đăng: chọn 1 gia sư từ danh sách ứng tuyển
const selectApplicant = async (req, res, next) => {
  try {
    const application = await classApplicationService.selectApplicant(
      req.user.id,
      req.params.id,
      req.params.applicationId,
    );
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.CLASS_APPLICANT_SELECT_SUCCESS,
      data: { application },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const cancelApplication = async (req, res, next) => {
  try {
    const application = await classApplicationService.cancelApplication(
      req.user.id,
      req.params.id,
      req.body.reason
    );
    const message =
      application.status === "cancelled"
        ? MESSAGE.CLASS_APPLICATION_CANCEL_SUCCESS
        : MESSAGE.CLASS_APPLICATION_CANCEL_REQUEST_SUCCESS;
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message,
      data: { application },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// ── Luồng mời gia sư trực tiếp (gia sư phản hồi lời mời) ──

const getMyInvitations = async (req, res, next) => {
  try {
    const result = await classApplicationService.getMyInvitations(req.user.id, req.query);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.CLASS_INVITATIONS_LIST_SUCCESS,
      data: result,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const acceptInvitation = async (req, res, next) => {
  try {
    const application = await classApplicationService.acceptInvitation(
      req.user.id,
      req.params.applicationId,
    );
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.CLASS_INVITE_ACCEPT_SUCCESS,
      data: { application },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const declineInvitation = async (req, res, next) => {
  try {
    const application = await classApplicationService.declineInvitation(
      req.user.id,
      req.params.applicationId,
      req.body.reason,
    );
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.CLASS_INVITE_DECLINE_SUCCESS,
      data: { application },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

module.exports = {
  applyForClass,
  getApplicants,
  selectApplicant,
  getMyApplications,
  cancelApplication,
  getMyInvitations,
  acceptInvitation,
  declineInvitation,
};
