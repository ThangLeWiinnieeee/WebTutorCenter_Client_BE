const express = require("express");
const router = express.Router();

const { validate, validateQuery } = require("../middlewares/validate.middleware");
const tutorAdminController = require("../controllers/tutorAdmin.controller");
const {
  rejectTutorSchema,
  adminListPendingTutorsQuerySchema,
} = require("../validations/tutorAdmin.validation");
const { validateObjectIdParams } = require("../validations/common.validation");

// Duyệt hồ sơ gia sư + thống kê dashboard (/admin/tutors)
router.get("/stats", tutorAdminController.getDashboardStats);
router.get("/pending", validateQuery(adminListPendingTutorsQuerySchema), tutorAdminController.getPendingTutors);
router.patch("/:id/approve", validateObjectIdParams("id"), tutorAdminController.approveTutor);
router.patch(
  "/:id/reject",
  validateObjectIdParams("id"),
  validate(rejectTutorSchema),
  tutorAdminController.rejectTutor
);

module.exports = router;
