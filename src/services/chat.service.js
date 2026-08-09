const conversationRepository = require("../repositories/conversation.repository");
const messageRepository = require("../repositories/message.repository");
const userRepository = require("../repositories/user.repository");
const tutorRepository = require("../repositories/tutor.repository");
const classRepository = require("../repositories/class.repository");
const { CHAT_ROLES, CHAT_CARD_KINDS } = require("../constants/chat");
const AppError = require("../utils/AppError");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");
const ROLES = require("../constants/role");
const { ConversationMapper, MessageMapper } = require("../mappers");
const { buildPagination } = require("../utils/pagination");
const { emitToUser, emitToAdmins } = require("../configs/socket");

// Tên sự kiện realtime (đồng bộ với FE)
const CHAT_EVENTS = {
  MESSAGE: "chat:message",
  READ: "chat:read",
  CONVERSATION: "chat:conversation",
};

// Lấy _id từ một tham chiếu (object đã populate hoặc id)
const extractId = (ref) => (ref && typeof ref === "object" ? ref._id : ref);

// Chuẩn hóa payload tin nhắn và đảm bảo có ít nhất text hoặc ảnh.
const normalizeMessageInput = ({ content, imageUrl } = {}) => {
  const text = (content || "").trim();
  const image = imageUrl || null;
  if (!text && !image) {
    throw new AppError(MESSAGE.CHAT_CONTENT_OR_IMAGE_REQUIRED, HTTP_STATUS.BAD_REQUEST);
  }
  return { text, image };
};

// Nội dung xem trước hiển thị ở danh sách hội thoại.
const buildPreview = (text, image) => text || (image ? "[Hình ảnh]" : "");

// ──────────────────────────── Người dùng (gia sư + học viên) ────────────────────────────
// Ghi chú: vai trò "tutor" trong chat đại diện cho "phía người dùng" (không phải admin),
// dùng chung cho cả gia sư lẫn học viên để giữ nguyên cấu trúc dữ liệu hiện có.

// Lấy (hoặc tạo) cuộc trò chuyện của chính người dùng + một trang tin nhắn.
const getTutorConversation = async (tutorUserId, query = {}) => {
  const conversation = await conversationRepository.findOrCreateByTutorUserId(tutorUserId);
  const { page = 1, limit = 30 } = query;

  const [docs, totalItems] = await Promise.all([
    messageRepository.findByConversationPage({ conversationId: conversation._id, page, limit }),
    messageRepository.countByConversation(conversation._id),
  ]);

  return {
    conversation: ConversationMapper.toDTO(conversation, CHAT_ROLES.TUTOR),
    messages: MessageMapper.toDTOList(docs),
    pagination: buildPagination({ page, limit, totalItems }),
  };
};

// Gia sư/người dùng gửi tin nhắn (text hoặc ảnh) cho admin
const sendMessageAsTutor = async (tutorUserId, input) => {
  const { text, image } = normalizeMessageInput(input);
  const conversation = await conversationRepository.findOrCreateByTutorUserId(tutorUserId);

  const message = await messageRepository.create({
    conversationId: conversation._id,
    senderId: tutorUserId,
    senderRole: CHAT_ROLES.TUTOR,
    content: text,
    imageUrl: image,
  });

  // Gia sư gửi → admin có thêm 1 tin chưa đọc; gia sư xem như đã đọc hết.
  const updated = await conversationRepository.updateById(conversation._id, {
    lastMessage: buildPreview(text, image),
    lastMessageAt: message.createdAt,
    lastSenderRole: CHAT_ROLES.TUTOR,
    tutorUnread: 0,
    $inc: { adminUnread: 1 },
  });

  const messageDTO = MessageMapper.toDTO(message);
  // Realtime: báo cho tất cả admin (cập nhật danh sách + badge) và các thiết bị khác của gia sư.
  emitToAdmins(CHAT_EVENTS.MESSAGE, {
    conversation: ConversationMapper.toDTO(updated, CHAT_ROLES.ADMIN),
    message: messageDTO,
  });
  emitToUser(tutorUserId, CHAT_EVENTS.MESSAGE, {
    conversationId: conversation._id,
    message: messageDTO,
    unreadCount: 0,
  });

  return messageDTO;
};

// Đánh dấu người dùng đã đọc hết tin nhắn
const markTutorRead = async (tutorUserId) => {
  const conversation = await conversationRepository.findOrCreateByTutorUserId(tutorUserId);
  await conversationRepository.updateById(conversation._id, { tutorUnread: 0 });
  // Đồng bộ các thiết bị khác của gia sư.
  emitToUser(tutorUserId, CHAT_EVENTS.READ, {
    conversationId: conversation._id,
    viewerRole: CHAT_ROLES.TUTOR,
  });
};

// Đếm số tin nhắn chưa đọc của người dùng
const getTutorUnreadCount = async (tutorUserId) => {
  const conversation = await conversationRepository.findByTutorUserId(tutorUserId);
  return conversation?.tutorUnread || 0;
};

// ──────────────────────────── Admin ────────────────────────────

// Lọc theo tên/email người dùng: tìm user khớp keyword (mọi vai trò trừ admin)
// rồi lọc conversation. Bao gồm cả gia sư lẫn học viên.
const buildAdminConversationFilter = async (keyword) => {
  if (!keyword || !keyword.trim()) return {};
  const userIds = await userRepository.findIdsByKeywordExcludingRole(keyword, ROLES.ADMIN);
  return { tutorUserId: { $in: userIds } };
};

// Lấy danh sách hội thoại cho admin (lọc theo tên/email + phân trang)
const getAdminConversations = async (query = {}) => {
  const { page = 1, limit = 20 } = query;
  const filter = await buildAdminConversationFilter(query.keyword);

  const [{ items, totalItems }, totalUnread] = await Promise.all([
    conversationRepository.findPageForAdmin({ filter, page, limit }),
    conversationRepository.sumAdminUnread(),
  ]);

  return {
    conversations: ConversationMapper.toDTOList(items, CHAT_ROLES.ADMIN),
    pagination: buildPagination({ page, limit, totalItems }),
    totalUnread,
  };
};

// Lấy tin nhắn của một hội thoại cho admin (phân trang)
const getAdminConversationMessages = async (conversationId, query = {}) => {
  const conversation = await conversationRepository.findById(conversationId);
  if (!conversation) throw new AppError(MESSAGE.CHAT_CONVERSATION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

  const { page = 1, limit = 30 } = query;

  const [docs, totalItems] = await Promise.all([
    messageRepository.findByConversationPage({ conversationId, page, limit }),
    messageRepository.countByConversation(conversationId),
  ]);

  return {
    conversation: ConversationMapper.toDTO(conversation, CHAT_ROLES.ADMIN),
    messages: MessageMapper.toDTOList(docs),
    pagination: buildPagination({ page, limit, totalItems }),
  };
};

// Cập nhật hội thoại + phát realtime cho một tin nhắn admin vừa tạo (text/ảnh/thẻ).
const finalizeAdminMessage = async (conversation, message, preview) => {
  // Admin gửi → gia sư có thêm 1 tin chưa đọc; phía admin xem như đã đọc.
  const updated = await conversationRepository.updateById(conversation._id, {
    lastMessage: preview,
    lastMessageAt: message.createdAt,
    lastSenderRole: CHAT_ROLES.ADMIN,
    adminUnread: 0,
    $inc: { tutorUnread: 1 },
  });

  const messageDTO = MessageMapper.toDTO(message);
  const tutorUserId = extractId(updated.tutorUserId);
  // Realtime: gửi cho gia sư + đồng bộ danh sách cho các admin khác.
  emitToUser(tutorUserId, CHAT_EVENTS.MESSAGE, {
    conversationId: conversation._id,
    message: messageDTO,
    unreadCount: updated.tutorUnread,
  });
  emitToAdmins(CHAT_EVENTS.MESSAGE, {
    conversation: ConversationMapper.toDTO(updated, CHAT_ROLES.ADMIN),
    message: messageDTO,
  });

  return messageDTO;
};

// Admin gửi tin nhắn (text hoặc ảnh) vào hội thoại
const sendMessageAsAdmin = async (conversationId, adminUserId, input) => {
  const { text, image } = normalizeMessageInput(input);
  const conversation = await conversationRepository.findById(conversationId);
  if (!conversation) throw new AppError(MESSAGE.CHAT_CONVERSATION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

  const message = await messageRepository.create({
    conversationId,
    senderId: adminUserId,
    senderRole: CHAT_ROLES.ADMIN,
    content: text,
    imageUrl: image,
  });

  return finalizeAdminMessage(conversation, message, buildPreview(text, image));
};

// Dựng thẻ thông tin từ DB — chỉ lấy dữ liệu công khai (họ tên/avatar gia sư, mã +
// môn bài đăng). Không đưa SĐT/giấy tờ/thông tin nhạy cảm vào thẻ.
const buildCard = async (kind, refId) => {
  if (kind === CHAT_CARD_KINDS.TUTOR) {
    const tutor = await tutorRepository.findById(refId);
    if (!tutor) throw new AppError(MESSAGE.TUTOR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    const u = tutor.userId;
    return {
      kind,
      refId: tutor._id,
      title: u?.fullName || "Gia sư",
      subtitle: tutor.subjects?.[0] || null,
      image: u?.avatar || null,
    };
  }
  const classItem = await classRepository.findById(refId);
  if (!classItem) throw new AppError(MESSAGE.CLASS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  return {
    kind,
    refId: classItem._id,
    title: classItem.classCode,
    subtitle: classItem.subject || null,
    image: null,
  };
};

// Admin đính kèm thẻ gia sư/bài đăng vào hội thoại (thay vì gõ text).
const sendCardAsAdmin = async (conversationId, adminUserId, { kind, refId }) => {
  const conversation = await conversationRepository.findById(conversationId);
  if (!conversation) throw new AppError(MESSAGE.CHAT_CONVERSATION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

  const card = await buildCard(kind, refId);
  const message = await messageRepository.create({
    conversationId,
    senderId: adminUserId,
    senderRole: CHAT_ROLES.ADMIN,
    content: "",
    imageUrl: null,
    card,
  });

  const preview = kind === CHAT_CARD_KINDS.TUTOR ? `[Gia sư] ${card.title}` : `[Bài đăng] ${card.title}`;
  return finalizeAdminMessage(conversation, message, preview);
};

// Đánh dấu admin đã đọc hết tin nhắn của hội thoại
const markAdminRead = async (conversationId) => {
  const conversation = await conversationRepository.findById(conversationId);
  if (!conversation) throw new AppError(MESSAGE.CHAT_CONVERSATION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  await conversationRepository.updateById(conversationId, { adminUnread: 0 });
  // Đồng bộ badge/đếm chưa đọc cho các admin khác.
  emitToAdmins(CHAT_EVENTS.READ, { conversationId, viewerRole: CHAT_ROLES.ADMIN });
};

// Đếm tổng số tin nhắn chưa đọc của admin trên mọi hội thoại
const getAdminUnreadTotal = async () => {
  const total = await conversationRepository.sumAdminUnread();
  return total;
};

// Admin chủ động mở cuộc trò chuyện với một người dùng (gia sư hoặc học viên),
// kể cả khi họ chưa nhắn tin trước.
const startConversationWithTutor = async (tutorUserId) => {
  const target = await userRepository.findById(tutorUserId);
  if (!target) throw new AppError(MESSAGE.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  if (target.role === ROLES.ADMIN) {
    throw new AppError(MESSAGE.CHAT_CANNOT_MESSAGE_ADMIN, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }
  const conversation = await conversationRepository.findOrCreateByTutorUserId(tutorUserId);
  const dto = ConversationMapper.toDTO(conversation, CHAT_ROLES.ADMIN);
  // Realtime: các admin khác thấy ngay hội thoại mới trong danh sách.
  emitToAdmins(CHAT_EVENTS.CONVERSATION, { conversation: dto });
  return dto;
};

module.exports = {
  getTutorConversation,
  sendMessageAsTutor,
  markTutorRead,
  getTutorUnreadCount,
  getAdminConversations,
  getAdminConversationMessages,
  sendMessageAsAdmin,
  sendCardAsAdmin,
  markAdminRead,
  getAdminUnreadTotal,
  startConversationWithTutor,
};
