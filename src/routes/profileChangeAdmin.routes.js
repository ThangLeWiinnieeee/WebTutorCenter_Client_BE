const express = require("express");
const router = express.Router();

const { validate, validateQuery } = require("../middlewares/validate.middleware");
const profileChangeAdminController = require("../controllers/profileChangeAdmin.controller");
const {
  adminListProfileChangesQuerySchema,
  rejectProfileChangeSchema,
} = require("../validations/profileChangeAdmin.validation");
const { validateObjectIdParams } = require("../validations/common.validation");

// Gia sư đổi hồ sơ (/admin/profile-changes)
router.get("/", validateQuery(adminListProfileChangesQuerySchema), profileChangeAdminController.getProfileChanges);
router.patch("/:id/approve", validateObjectIdParams("id"), profileChangeAdminController.approveProfileChange);
router.patch(
  "/:id/reject",
  validateObjectIdParams("id"),
  validate(rejectProfileChangeSchema),
  profileChangeAdminController.rejectProfileChange
);

module.exports = router;
