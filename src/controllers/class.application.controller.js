const classApplicationService = require("../services/class.application.service");
const { successResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");


// Gia sư ứng tuyển vào một lớp
const applyForClass = async (req, res, next) => {
  try {
    const application = await classApplicationService.applyForClass(req.user.id, req.params.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: MESSAGE.CLASS_APPLICATION_APPLY_SUCCESS,
      data: { application },
    });
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách đơn ứng tuyển của gia sư hiện tại
const getMyApplications = async (req, res, next) => {
  try {
    const result = await classApplicationService.getMyApplications(req.user.id, req.query);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.CLASS_APPLICATION_LIST_SUCCESS,
      data: result,
    });
  } catch (error) {
    next(error);
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
    next(error);
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
    next(error);
  }
};

// Huỷ đơn ứng tuyển (hoặc gửi yêu cầu huỷ nếu đã được chọn)
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
    next(error);
  }
};

// ── Luồng mời gia sư trực tiếp (gia sư phản hồi lời mời) ──

// Lấy danh sách lời mời dạy của gia sư hiện tại
const getMyInvitations = async (req, res, next) => {
  try {
    const result = await classApplicationService.getMyInvitations(req.user.id, req.query);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.CLASS_INVITATIONS_LIST_SUCCESS,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Gia sư chấp nhận lời mời dạy
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
    next(error);
  }
};

// Gia sư từ chối lời mời dạy
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
    next(error);
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
