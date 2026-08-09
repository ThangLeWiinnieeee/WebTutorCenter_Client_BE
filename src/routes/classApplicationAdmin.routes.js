const express = require("express");
const router = express.Router();

const { validate, validateQuery } = require("../middlewares/validate.middleware");
const classApplicationAdminController = require("../controllers/classApplicationAdmin.controller");
const {
  rejectClassApplicationSchema,
  adminListClassApplicationsQuerySchema,
  classApplicationStatsQuerySchema,
} = require("../validations/classApplicationAdmin.validation");
const { validateObjectIdParams } = require("../validations/common.validation");

// Duyệt đơn nhận lớp (/admin/class-applications)
router.get(
  "/stats",
  validateQuery(classApplicationStatsQuerySchema),
  classApplicationAdminController.getClassApplicationStats
);
router.get("/", validateQuery(adminListClassApplicationsQuerySchema), classApplicationAdminController.getClassApplications);
router.patch("/:id/approve", validateObjectIdParams("id"), classApplicationAdminController.approveClassApplication);
router.patch(
  "/:id/reject",
  validateObjectIdParams("id"),
  validate(rejectClassApplicationSchema),
  classApplicationAdminController.rejectClassApplication
);

module.exports = router;
