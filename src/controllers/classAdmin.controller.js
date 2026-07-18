const classAdminService = require("../services/classAdmin.service");
const { successResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");

const handleError = require("../utils/handleError");

// Lấy danh sách lớp học cho admin
const getAdminClasses = async (req, res, next) => {
  try {
    const data = await classAdminService.getAdminClasses(req.query);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.LIST_SUCCESS,
      data,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// Lấy chi tiết một lớp học cho admin
const getAdminClassDetail = async (req, res, next) => {
  try {
    const classItem = await classAdminService.getAdminClassDetail(req.params.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.DETAIL_SUCCESS,
      data: { classItem },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// Chuyển lớp học vào thùng rác (xoá mềm)
const deleteAdminClass = async (req, res, next) => {
  try {
    const result = await classAdminService.deleteAdminClass(req.params.id, req.user.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.CLASS_TRASH_SUCCESS,
      data: result,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

module.exports = {
  getAdminClasses,
  getAdminClassDetail,
  deleteAdminClass,
};
