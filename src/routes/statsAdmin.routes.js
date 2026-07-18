const express = require("express");
const router = express.Router();

const statsAdminController = require("../controllers/statsAdmin.controller");

// Thống kê tổng hợp cho dashboard + trang thống kê (/admin/stats)
router.get("/summary", statsAdminController.getSummary);

module.exports = router;
