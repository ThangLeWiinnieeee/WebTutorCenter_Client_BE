const express = require("express");
const router = express.Router();

const { validateParams, validateQuery } = require("../middlewares/validate.middleware");
const trashAdminController = require("../controllers/trashAdmin.controller");
const {
  adminTrashListQuerySchema,
  trashTypeParamsSchema,
  trashItemParamsSchema,
} = require("../validations/trashAdmin.validation");

// Thùng rác — xóa mềm (/admin/trash)
router.get("/counts", trashAdminController.getTrashCounts);
router.get(
  "/:type",
  validateParams(trashTypeParamsSchema),
  validateQuery(adminTrashListQuerySchema),
  trashAdminController.getTrashItems
);
router.patch("/:type/:id/restore", validateParams(trashItemParamsSchema), trashAdminController.restoreTrashItem);
router.delete("/:type/:id", validateParams(trashItemParamsSchema), trashAdminController.purgeTrashItem);

module.exports = router;
