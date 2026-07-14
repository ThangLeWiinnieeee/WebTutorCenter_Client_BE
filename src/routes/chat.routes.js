const express = require("express");
const router = express.Router();

const chatController = require("../controllers/chat.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const roleMiddleware = require("../middlewares/role.middleware");
const ROLES = require("../constants/role");
const { uploadChatImageMiddleware } = require("../utils/upload");
const {
  validate,
  validateQuery,
  sendMessageSchema,
  sendCardSchema,
  startConversationSchema,
  messagesQuerySchema,
  conversationsQuerySchema,
} = require("../validations/chat.validation");

router.use(authMiddleware);

// ──────────────────────────── Người dùng (gia sư + học viên) — cuộc trò chuyện duy nhất với admin ────────────────────────────
// Mọi người dùng không phải admin đều có thể nhắn tin liên hệ admin.
const MEMBER_ROLES = [ROLES.TUTOR, ROLES.USER];

router.get(
  "/my-conversation",
  roleMiddleware(...MEMBER_ROLES),
  validateQuery(messagesQuerySchema),
  chatController.getMyConversation
);
router.get("/my-conversation/unread-count", roleMiddleware(...MEMBER_ROLES), chatController.getMyUnreadCount);
router.post(
  "/my-conversation/messages",
  roleMiddleware(...MEMBER_ROLES),
  validate(sendMessageSchema),
  chatController.sendMyMessage
);
// Gửi tin nhắn kèm ảnh (multipart/form-data, field "image", "content" tùy chọn).
router.post(
  "/my-conversation/images",
  roleMiddleware(...MEMBER_ROLES),
  uploadChatImageMiddleware,
  chatController.sendMyImageMessage
);
router.post(
  "/my-conversation/read",
  roleMiddleware(...MEMBER_ROLES),
  chatController.markMyConversationRead
);

// ──────────────────────────── Admin ────────────────────────────
router.get(
  "/conversations",
  roleMiddleware(ROLES.ADMIN),
  validateQuery(conversationsQuerySchema),
  chatController.getConversations
);
router.get(
  "/conversations/unread-count",
  roleMiddleware(ROLES.ADMIN),
  chatController.getAdminUnreadCount
);
router.post(
  "/conversations",
  roleMiddleware(ROLES.ADMIN),
  validate(startConversationSchema),
  chatController.startConversation
);
router.get(
  "/conversations/:id/messages",
  roleMiddleware(ROLES.ADMIN),
  validateQuery(messagesQuerySchema),
  chatController.getConversationMessages
);
router.post(
  "/conversations/:id/messages",
  roleMiddleware(ROLES.ADMIN),
  validate(sendMessageSchema),
  chatController.sendConversationMessage
);
// Gửi tin nhắn kèm ảnh (multipart/form-data, field "image", "content" tùy chọn).
router.post(
  "/conversations/:id/images",
  roleMiddleware(ROLES.ADMIN),
  uploadChatImageMiddleware,
  chatController.sendConversationImageMessage
);
// Gửi thẻ thông tin gia sư/bài đăng (chỉ admin) — { kind: "tutor"|"class", refId }.
router.post(
  "/conversations/:id/card",
  roleMiddleware(ROLES.ADMIN),
  validate(sendCardSchema),
  chatController.sendConversationCard
);
router.post(
  "/conversations/:id/read",
  roleMiddleware(ROLES.ADMIN),
  chatController.markConversationRead
);

module.exports = router;
