const express = require("express");
const router = express.Router();

const userController = require("../controllers/user.controller");
const { userValidation } = require("../validations");
const { updateProfileSchema, changePasswordSchema, validate } = userValidation;
const authMiddleware = require("../middlewares/auth.middleware");
const { uploadAvatarMiddleware } = require("../utils/upload");
const { validateObjectIdParams } = require("../validations/common.validation");
const { requireUploadedFile } = require("../middlewares/upload.middleware");
const MESSAGE = require("../constants/message");

router.get("/user-info", authMiddleware, userController.getUserInfo);
router.post(
  "/upload-avatar",
  authMiddleware,
  uploadAvatarMiddleware,
  requireUploadedFile(MESSAGE.UPLOAD_AVATAR_FAILED),
  userController.uploadAvatar
);
router.patch("/update-profile", authMiddleware, validate(updateProfileSchema), userController.updateProfile);

router.post(
  "/change-password",
  authMiddleware,
  validate(changePasswordSchema),
  userController.changePassword
);

// Quản lý phiên đăng nhập theo thiết bị
router.get("/sessions", authMiddleware, userController.getSessions);
router.delete("/sessions", authMiddleware, userController.revokeAllSessions);
router.delete("/sessions/:id", authMiddleware, validateObjectIdParams("id"), userController.revokeSession);

module.exports = router;
