const subjectService = require("../services/subject.service");
const { successResponse } = require("../utils/response");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");


// Public: danh sách tên môn đang bật (cho các form chọn môn).
const getActiveSubjects = async (req, res, next) => {
  try {
    const subjects = await subjectService.getActiveSubjectNames();
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.SUBJECT_LIST_SUCCESS,
      data: { subjects },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: danh sách đầy đủ (kể cả môn đã tắt) để quản lý.
const getAdminSubjects = async (req, res, next) => {
  try {
    const subjects = await subjectService.listForAdmin({ keyword: req.query.keyword });
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.SUBJECT_LIST_SUCCESS,
      data: { subjects },
    });
  } catch (error) {
    next(error);
  }
};

// Tạo môn học mới
const createSubject = async (req, res, next) => {
  try {
    const subject = await subjectService.createSubject(req.body);
    return successResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: MESSAGE.SUBJECT_CREATE_SUCCESS,
      data: { subject },
    });
  } catch (error) {
    next(error);
  }
};

// Cập nhật môn học (tên, trạng thái, thứ tự)
const updateSubject = async (req, res, next) => {
  try {
    const subject = await subjectService.updateSubject(req.params.id, req.body);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.SUBJECT_UPDATE_SUCCESS,
      data: { subject },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActiveSubjects,
  getAdminSubjects,
  createSubject,
  updateSubject,
};
