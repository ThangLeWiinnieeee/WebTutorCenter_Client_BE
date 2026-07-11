const trashAdminService = require("../services/trashAdmin.service");
const { successResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");

const handleError = require("../utils/handleError");

const getTrashItems = async (req, res, next) => {
  try {
    const data = await trashAdminService.getTrashItems(req.params.type, req.query);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TRASH_LIST_SUCCESS,
      data,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const getTrashCounts = async (req, res, next) => {
  try {
    const counts = await trashAdminService.getTrashCounts();
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TRASH_COUNTS_SUCCESS,
      data: { counts },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const restoreTrashItem = async (req, res, next) => {
  try {
    const result = await trashAdminService.restoreTrashItem(req.params.type, req.params.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TRASH_RESTORE_SUCCESS,
      data: result,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const purgeTrashItem = async (req, res, next) => {
  try {
    const result = await trashAdminService.purgeTrashItem(req.params.type, req.params.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.TRASH_PURGE_SUCCESS,
      data: result,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

module.exports = {
  getTrashItems,
  getTrashCounts,
  restoreTrashItem,
  purgeTrashItem,
};
