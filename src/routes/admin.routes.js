const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const roleMiddleware = require("../middlewares/role.middleware");

// Mỗi chức năng admin được tách thành router riêng (<chức năng>Admin.routes.js)
const userAdminRoutes = require("./userAdmin.routes");
const classAdminRoutes = require("./classAdmin.routes");
const trashAdminRoutes = require("./trashAdmin.routes");
const tutorAdminRoutes = require("./tutorAdmin.routes");
const classApplicationAdminRoutes = require("./classApplicationAdmin.routes");
const cancellationAdminRoutes = require("./cancellationAdmin.routes");
const reviewAdminRoutes = require("./reviewAdmin.routes");
const profileChangeAdminRoutes = require("./profileChangeAdmin.routes");
const paymentAdminRoutes = require("./paymentAdmin.routes");
const statsAdminRoutes = require("./statsAdmin.routes");

// Áp dụng auth + admin role check cho tất cả admin routes
router.use(authMiddleware, roleMiddleware("admin"));

router.use("/users", userAdminRoutes);
router.use("/classes", classAdminRoutes);
router.use("/trash", trashAdminRoutes);
router.use("/tutors", tutorAdminRoutes);
router.use("/class-applications", classApplicationAdminRoutes);
router.use("/application-cancellations", cancellationAdminRoutes);
router.use("/reviews", reviewAdminRoutes);
router.use("/profile-changes", profileChangeAdminRoutes);
router.use("/payments", paymentAdminRoutes);
router.use("/stats", statsAdminRoutes);

module.exports = router;
