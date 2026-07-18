const express = require("express");
const router = express.Router();

const paymentAdminController = require("../controllers/paymentAdmin.controller");

// Quản lý thanh toán phí nhận lớp của gia sư (/admin/payments)
router.get("/", paymentAdminController.getPayments);

module.exports = router;
