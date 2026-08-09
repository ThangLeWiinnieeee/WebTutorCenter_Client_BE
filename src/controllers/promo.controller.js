const promoService = require("../services/promo.service");
const { successResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");


// ──────────────────────────── Admin ────────────────────────────

// Tạo mã giảm giá mới
const createPromo = async (req, res, next) => {
  try {
    const promo = await promoService.createPromo(req.body);
    return successResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: MESSAGE.PROMO_CREATE_SUCCESS,
      data: { promo },
    });
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách mã giảm giá cho admin
const listPromos = async (req, res, next) => {
  try {
    const data = await promoService.listPromos(req.query);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.PROMO_LIST_SUCCESS,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Cập nhật mã giảm giá
const updatePromo = async (req, res, next) => {
  try {
    const promo = await promoService.updatePromo(req.params.id, req.body);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.PROMO_UPDATE_SUCCESS,
      data: { promo },
    });
  } catch (error) {
    next(error);
  }
};

// Xoá mã giảm giá
const deletePromo = async (req, res, next) => {
  try {
    const promo = await promoService.deletePromo(req.params.id, req.user.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.PROMO_DELETE_SUCCESS,
      data: { promo },
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────── Public (đã đăng nhập) ────────────────────────────

// Kiểm tra và áp dụng mã giảm giá cho số tiền đơn hàng
const validatePromo = async (req, res, next) => {
  try {
    const result = await promoService.validatePromoForAmount(req.body.code, req.body.amount, req.user.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.PROMO_APPLY_SUCCESS,
      data: result,
    });
  } catch (error) {
    next(error);
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
    next(error);
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
