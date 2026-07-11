const promoService = require("../services/promo.service");
const { successResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");

const handleError = require("../utils/handleError");

// ──────────────────────────── Admin ────────────────────────────

const createPromo = async (req, res, next) => {
  try {
    const promo = await promoService.createPromo(req.body);
    return successResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: MESSAGE.PROMO_CREATE_SUCCESS,
      data: { promo },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const listPromos = async (req, res, next) => {
  try {
    const data = await promoService.listPromos(req.query);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.PROMO_LIST_SUCCESS,
      data,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const updatePromo = async (req, res, next) => {
  try {
    const promo = await promoService.updatePromo(req.params.id, req.body);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.PROMO_UPDATE_SUCCESS,
      data: { promo },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const deletePromo = async (req, res, next) => {
  try {
    const promo = await promoService.deletePromo(req.params.id, req.user.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.PROMO_DELETE_SUCCESS,
      data: { promo },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// ──────────────────────────── Public (đã đăng nhập) ────────────────────────────

const validatePromo = async (req, res, next) => {
  try {
    const result = await promoService.validatePromoForAmount(req.body.code, req.body.amount, req.user.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.PROMO_APPLY_SUCCESS,
      data: result,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// Kho mã giảm giá của người dùng hiện tại
const getMyVouchers = async (req, res, next) => {
  try {
    const result = await promoService.listMyVouchers(req.user.id, req.query);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.VOUCHER_LIST_SUCCESS,
      data: result,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

module.exports = {
  createPromo,
  listPromos,
  updatePromo,
  deletePromo,
  validatePromo,
  getMyVouchers,
};
