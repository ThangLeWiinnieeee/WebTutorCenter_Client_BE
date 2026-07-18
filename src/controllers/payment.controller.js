const paymentService = require("../services/payment.service");
const { successResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");
const handleError = require("../utils/handleError");

// FE origin để bounce người dùng về sau khi cổng redirect (CLIENT_URL có thể nhiều origin, lấy cái đầu).
const CLIENT_URL = (process.env.CLIENT_URL || "http://localhost:4000").split(",")[0].trim();

// Danh sách cổng đã cấu hình để FE cho gia sư chọn.
const getProviders = async (req, res, next) => {
  try {
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.PAYMENT_PROVIDERS_LIST_SUCCESS,
      data: { providers: paymentService.getAvailableProviders() },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// Khởi tạo thanh toán phí nhận lớp qua cổng đã chọn
const initiateClassFee = async (req, res, next) => {
  try {
    const providerKey = req.body.provider;
    const base = `${req.protocol}://${req.get("host")}/api/payments/${providerKey}`;
    const rawIp = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip || "127.0.0.1";
    const result = await paymentService.initiateClassFeePayment(req.user.id, req.body.applicationId, {
      providerKey,
      ipAddr: String(rawIp).split(",")[0].trim(),
      returnUrl: `${base}/return`,
      ipnUrl: `${base}/ipn`,
    });
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.PAYMENT_INIT_SUCCESS,
      data: result,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

// Cổng redirect người dùng về đây (GET, không JWT) → cập nhật trạng thái rồi đưa về FE.
const paymentReturn = async (req, res) => {
  let outcome = { status: "failed", classCode: null };
  try {
    outcome = await paymentService.handleReturn(req.params.provider, req.query);
  } catch (err) {
    // Không để lỗi làm treo trang cổng — coi như thất bại, vẫn đưa người dùng về danh sách nhận lớp.
    console.error("Payment return error:", err);
  }
  const params = new URLSearchParams({ payment: outcome.status });
  if (outcome.classCode) params.set("classCode", outcome.classCode);
  return res.redirect(`${CLIENT_URL}/my-classes?${params.toString()}`);
};

// IPN/callback server-to-server của cổng (MoMo/ZaloPay). Localhost sandbox không nhận được,
// nguồn quyết định là redirect + query. Ở đây chỉ ACK để cổng không retry-spam.
// ponytail: no-op ACK; xử lý IPN thật khi deploy public (redirect có thể mất nếu user đóng tab).
const paymentIpn = async (req, res) => {
  if (req.params.provider === "zalopay") {
    return res.json({ return_code: 1, return_message: "success" });
  }
  return res.status(HTTP_STATUS.NO_CONTENT).end();
};

// Lấy lịch sử thanh toán của người dùng hiện tại
const getMyPayments = async (req, res, next) => {
  try {
    const result = await paymentService.getMyPayments(req.user.id, req.query);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.PAYMENT_LIST_SUCCESS,
      data: result,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

module.exports = {
  getProviders,
  initiateClassFee,
  paymentReturn,
  paymentIpn,
  getMyPayments,
};
