const express = require("express");
const paymentController = require("../controllers/payment.controller");
const { paymentValidation } = require("../validations");
const { initiateClassFeeSchema, validateBody } = paymentValidation;
const authMiddleware = require("../middlewares/auth.middleware");
const roleMiddleware = require("../middlewares/role.middleware");

const router = express.Router();

// Danh sách cổng thanh toán đã cấu hình (cho gia sư chọn)
router.get("/providers", authMiddleware, roleMiddleware("tutor"), paymentController.getProviders);
// Gia sư khởi tạo thanh toán phí nhận lớp qua 1 cổng → trả URL cổng để redirect
router.post(
  "/class-fee",
  authMiddleware,
  roleMiddleware("tutor"),
  validateBody(initiateClassFeeSchema),
  paymentController.initiateClassFee,
);
// Gia sư xem lịch sử hóa đơn thanh toán phí nhận lớp của mình
router.get("/mine", authMiddleware, roleMiddleware("tutor"), paymentController.getMyPayments);
// Cổng redirect người dùng về (công khai, không JWT) — xác thực bằng chữ ký, rồi bounce về FE
router.get("/:provider/return", paymentController.paymentReturn);
// IPN/callback server-to-server của cổng (no-op ACK)
router.post("/:provider/ipn", paymentController.paymentIpn);

module.exports = router;
