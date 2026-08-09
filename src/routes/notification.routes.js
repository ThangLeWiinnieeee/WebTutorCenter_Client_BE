const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const notificationController = require("../controllers/notification.controller");
const { validateQuery } = require("../middlewares/validate.middleware");
const { validateObjectIdParams } = require("../validations/common.validation");
const {
  listNotificationsQuerySchema,
  markAllNotificationsReadSchema,
} = require("../validations/notification.validation");

router.use(authMiddleware);

router.get("/", validateQuery(listNotificationsQuerySchema), notificationController.getNotifications);
router.patch("/read-all", validateQuery(markAllNotificationsReadSchema), notificationController.markAllAsRead);
router.patch("/:id/read", validateObjectIdParams("id"), notificationController.markAsRead);

module.exports = router;
