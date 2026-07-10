const tutorService = require("../services/tutor.service");
const profileChangeRequestService = require("../services/profileChangeRequest.service");
const { successResponse } = require("../utils/response");
const AppError = require("../utils/AppError");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");

const handleError = require("../utils/handleError");

const registerTutor = async (req, res, next) => {
  try {
    const tutor = await tutorService.registerTutor(req.user.id, req.body);

    return successResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: MESSAGE.TUTOR_REGISTER_SUCCESS,
      data: { tutor },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const getTutorProfile = async (req, res, next) => {
  try {
    const tutor = await tutorService.getTutorProfile(req.user.id);

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_GET_SUCCESS,
      data: { tutor },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// Lấy danh sách gia sư đã approved (phân trang)
const getActiveTutors = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await tutorService.getActiveTutors(page, limit);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_LIST_SUCCESS,
      data: result,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// Lấy top 10 gia sư nổi bật tháng đó
const getTopTutors = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const tutors = await tutorService.getTopTutors(limit);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_TOP_SUCCESS,
      data: { tutors },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// Lấy top 10 gia sư tháng hiện tại
const getTopTutorsThisMonth = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const tutors = await tutorService.getTopTutorsThisMonth(limit);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_TOP_MONTH_SUCCESS,
      data: { tutors },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// Lấy gia sư mới được approved
const getNewTutors = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const limit = parseInt(req.query.limit) || 10;
    const tutors = await tutorService.getNewTutors(days, limit);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_NEW_SUCCESS,
      data: { tutors },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// Tìm kiếm & lọc gia sư
const searchActiveTutors = async (req, res, next) => {
  try {
    const filters = {
      name: req.query.name,
      subject: req.query.subject,
      occupationStatus: req.query.occupationStatus,
      gender: req.query.gender,
      yearOfBirth: req.query.yearOfBirth,
      province: req.query.province ? parseInt(req.query.province) : null,
      district: req.query.district ? parseInt(req.query.district) : null,
    };

    // Loại bỏ các filter có giá trị null/undefined
    Object.keys(filters).forEach((key) => {
      if (!filters[key]) delete filters[key];
    });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await tutorService.searchActiveTutors(filters, page, limit);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_SEARCH_SUCCESS,
      data: result,
    });
  } catch (error) {
    handleError(error, res, next);
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
    handleError(error, res, next);
  }
};

// Upload một ảnh giấy tờ xác thực (CCCD/bằng cấp) → trả về URL Cloudinary để gắn vào form đăng ký
const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError(MESSAGE.TUTOR_UPLOAD_DOC_FAILED, HTTP_STATUS.BAD_REQUEST);
    }
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TUTOR_UPLOAD_DOC_SUCCESS,
      data: { url: req.file.path },
    });
  } catch (error) {
    handleError(error, res, next);
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
    handleError(error, res, next);
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
    handleError(error, res, next);
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
