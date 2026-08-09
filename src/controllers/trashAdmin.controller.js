const trashAdminService = require("../services/trashAdmin.service");
const { successResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");


// Lấy danh sách mục trong thùng rác theo loại
const getTrashItems = async (req, res, next) => {
  try {
    const data = await trashAdminService.getTrashItems(req.params.type, req.query);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TRASH_LIST_SUCCESS,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Đếm số mục trong thùng rác theo từng loại
const getTrashCounts = async (req, res, next) => {
  try {
    const counts = await trashAdminService.getTrashCounts();
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TRASH_COUNTS_SUCCESS,
      data: { counts },
    });
  } catch (error) {
    next(error);
  }
};

// Khôi phục một mục từ thùng rác
const restoreTrashItem = async (req, res, next) => {
  try {
    const result = await trashAdminService.restoreTrashItem(req.params.type, req.params.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TRASH_RESTORE_SUCCESS,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Xoá vĩnh viễn một mục trong thùng rác
const purgeTrashItem = async (req, res, next) => {
  try {
    const result = await trashAdminService.purgeTrashItem(req.params.type, req.params.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TRASH_PURGE_SUCCESS,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTrashItems,
  getTrashCounts,
  restoreTrashItem,
  purgeTrashItem,
};
