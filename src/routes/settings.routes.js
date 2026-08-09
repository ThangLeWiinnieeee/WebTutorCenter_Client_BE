const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settings.controller");
const { updateFooterSchema, validateBody } = require("../validations/settings.validation");
const authMiddleware = require("../middlewares/auth.middleware");
const roleMiddleware = require("../middlewares/role.middleware");

// Public endpoint to read footer
router.get("/footer", settingsController.getFooterSettings);

// Admin-only endpoint to update footer
router.put(
  "/footer",
  authMiddleware,
  roleMiddleware("admin"),
  validateBody(updateFooterSchema),
  settingsController.updateFooterSettings
);

module.exports = router;
