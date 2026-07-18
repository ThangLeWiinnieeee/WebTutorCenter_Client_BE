const paymentAdminService = require("../services/paymentAdmin.service");
const { successResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");
const handleError = require("../utils/handleError");

// Lấy danh sách giao dịch thanh toán cho admin
const getPayments = async (req, res, next) => {
  try {
    const result = await paymentAdminService.getPayments(req.query);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.PAYMENT_ADMIN_LIST_SUCCESS,
      data: result,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

module.exports = { getPayments };
