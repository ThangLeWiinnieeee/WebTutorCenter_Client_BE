const tutorService = require("../services/tutor.service");
const profileChangeRequestService = require("../services/profileChangeRequest.service");
const { successResponse } = require("../utils/response");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");


// Đăng ký hồ sơ gia sư
const registerTutor = async (req, res, next) => {
  try {
    const tutor = await tutorService.registerTutor(req.user.id, req.body);

    return successResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: MESSAGE.TUTOR_REGISTER_SUCCESS,
      data: { tutor },
    });
  } catch (error) {
    next(error);
  }
};

// Lấy hồ sơ gia sư của người dùng hiện tại
const getTutorProfile = async (req, res, next) => {
  try {
    const tutor = await tutorService.getTutorProfile(req.user.id);

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_GET_SUCCESS,
      data: { tutor },
    });
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách gia sư đã approved (phân trang)
const getActiveTutors = async (req, res, next) => {
  try {
    const result = await tutorService.getActiveTutors(req.query.page, req.query.limit);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_LIST_SUCCESS,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Lấy top 10 gia sư nổi bật tháng đó
const getTopTutors = async (req, res, next) => {
  try {
    const tutors = await tutorService.getTopTutors(req.query.limit);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_TOP_SUCCESS,
      data: { tutors },
    });
  } catch (error) {
    next(error);
  }
};

// Lấy top 10 gia sư tháng hiện tại
const getTopTutorsThisMonth = async (req, res, next) => {
  try {
    const tutors = await tutorService.getTopTutorsThisMonth(req.query.limit);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_TOP_MONTH_SUCCESS,
      data: { tutors },
    });
  } catch (error) {
    next(error);
  }
};

// Lấy gia sư mới được approved
const getNewTutors = async (req, res, next) => {
  try {
    const tutors = await tutorService.getNewTutors(req.query.days, req.query.limit);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_NEW_SUCCESS,
      data: { tutors },
    });
  } catch (error) {
    next(error);
  }
};

// Tìm kiếm & lọc gia sư
const searchActiveTutors = async (req, res, next) => {
  try {
    const { page, limit, ...filters } = req.query;
    const result = await tutorService.searchActiveTutors(filters, page, limit);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_SEARCH_SUCCESS,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Lấy chi tiết một gia sư (public endpoint)
const getTutorById = async (req, res, next) => {
  try {
    const tutor = await tutorService.getTutorById(req.params.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_GET_SUCCESS,
      data: { tutor },
    });
  } catch (error) {
    next(error);
  }
};

// Upload một ảnh giấy tờ xác thực (CCCD/bằng cấp) → trả về URL Cloudinary để gắn vào form đăng ký
const uploadDocument = async (req, res, next) => {
  try {
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_UPLOAD_DOC_SUCCESS,
      data: { url: req.file.path },
    });
  } catch (error) {
    next(error);
  }
};

// Gia sư gửi yêu cầu đổi thông tin hồ sơ (chờ admin duyệt)
const requestProfileChange = async (req, res, next) => {
  try {
    const request = await profileChangeRequestService.requestChange(req.user.id, req.body);
    return successResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: MESSAGE.PROFILE_CHANGE_REQUEST_SUCCESS,
      data: { request },
    });
  } catch (error) {
    next(error);
  }
};

// Lấy yêu cầu đổi thông tin đang chờ duyệt của gia sư (nếu có)
const getMyProfileChangeRequest = async (req, res, next) => {
  try {
    const request = await profileChangeRequestService.getMyPending(req.user.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.PROFILE_CHANGE_GET_SUCCESS,
      data: { request },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerTutor,
  uploadDocument,
  getTutorProfile,
  getActiveTutors,
  getTopTutors,
  getTopTutorsThisMonth,
  getNewTutors,
  searchActiveTutors,
  getTutorById,
  requestProfileChange,
  getMyProfileChangeRequest,
};
