const classService = require("../services/class.service");
const { successResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");

// Báo giá học phí cho lớp dựa trên tham số đầu vào
const quoteClass = async (req, res, next) => {
  try {
    const quote = await classService.quoteClass(req.body);
    return successResponse(res, {
      message: MESSAGE.QUOTE_SUCCESS,
      data: quote,
    });
  } catch (error) {
    next(error);
  }
};

// Tạo bài đăng tìm gia sư
const createClass = async (req, res, next) => {
  try {
    const created = await classService.createClass(req.body, req.user.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: MESSAGE.CREATE_SUCCESS,
      data: { classItem: created },
    });
  } catch (error) {
    next(error);
  }
};

// Người đăng mời một gia sư cụ thể dạy lớp (luồng "mời gia sư trực tiếp")
const createInvite = async (req, res, next) => {
  try {
    const created = await classService.createInvitedClass(req.body, req.user.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: MESSAGE.CLASS_INVITE_SUCCESS,
      data: { classItem: created },
    });
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách lớp có lọc và phân trang
const getClasses = async (req, res, next) => {
  try {
    const result = await classService.getClasses(req.query, req.user);
    return successResponse(res, {
      message: MESSAGE.LIST_SUCCESS,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách lớp phù hợp cho gia sư (feed)
const getClassFeed = async (req, res, next) => {
  try {
    const result = await classService.getClassFeedForTutor(req.user.id, req.query);
    return successResponse(res, {
      message: MESSAGE.CLASS_FEED_SUCCESS,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách bài đăng lớp của người dùng hiện tại
const getMyPosts = async (req, res, next) => {
  try {
    const result = await classService.getMyPostedClasses(req.user.id, req.query);
    return successResponse(res, {
      message: MESSAGE.MY_POSTS_SUCCESS,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Lấy chi tiết một lớp
const getClassDetail = async (req, res, next) => {
  try {
    const classItem = await classService.getClassById(req.params.id, req.user);
    return successResponse(res, {
      message: MESSAGE.DETAIL_SUCCESS,
      data: { classItem },
    });
  } catch (error) {
    next(error);
  }
};

// Cập nhật bài đăng lớp của người đăng
const updateClass = async (req, res, next) => {
  try {
    const classItem = await classService.updatePostedClass(req.params.id, req.user.id, req.body);
    return successResponse(res, {
      message: MESSAGE.CLASS_UPDATE_SUCCESS,
      data: { classItem },
    });
  } catch (error) {
    next(error);
  }
};

// Xoá bài đăng lớp của người đăng
const deleteClass = async (req, res, next) => {
  try {
    const result = await classService.deletePostedClass(req.params.id, req.user.id);
    return successResponse(res, {
      message: MESSAGE.CLASS_DELETE_SUCCESS,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Xác nhận hoàn thành lớp
const completeClass = async (req, res, next) => {
  try {
    const classItem = await classService.confirmClassCompletion(req.user.id, req.params.id);
    return successResponse(res, {
      message: MESSAGE.CLASS_COMPLETE_SUCCESS,
      data: { classItem },
    });
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách môn học
const getSubjects = async (req, res, next) => {
  try {
    const subjects = await classService.getSubjects();
    return successResponse(res, {
      message: MESSAGE.SUBJECT_LIST_SUCCESS,
      data: { subjects },
    });
  } catch (error) {
    next(error);
  }
};

// Lấy cấu hình bảng giá học phí
const getPricingConfig = async (req, res, next) => {
  try {
    const pricingConfig = await classService.getPricingConfig();
    return successResponse(res, {
      message: MESSAGE.PRICING_CONFIG_SUCCESS,
      data: { pricingConfig },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  quoteClass,
  createClass,
  createInvite,
  getClasses,
  getClassFeed,
  getMyPosts,
  getClassDetail,
  updateClass,
  deleteClass,
  completeClass,
  getSubjects,
  getPricingConfig,
};
