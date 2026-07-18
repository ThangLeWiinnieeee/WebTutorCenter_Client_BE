const chatService = require("../services/chat.service");
const { successResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");

// ──────────────────────────── Gia sư ────────────────────────────

// Lấy cuộc trò chuyện của gia sư kèm tin nhắn
const getMyConversation = async (req, res, next) => {
  try {
    const result = await chatService.getTutorConversation(req.user.id, req.query);
    return successResponse(res, { message: MESSAGE.CHAT_GET_CONVERSATION_SUCCESS, data: result });
  } catch (error) {
    next(error);
  }
};

// Gia sư gửi tin nhắn văn bản
const sendMyMessage = async (req, res, next) => {
  try {
    const message = await chatService.sendMessageAsTutor(req.user.id, { content: req.body.content });
    return successResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: MESSAGE.CHAT_MESSAGE_SENT,
      data: { message },
    });
  } catch (error) {
    next(error);
  }
};

// Gia sư gửi tin nhắn kèm ảnh
const sendMyImageMessage = async (req, res, next) => {
  try {
    const message = await chatService.sendMessageAsTutor(req.user.id, {
      content: req.body.content,
      imageUrl: req.file?.path,
    });
    return successResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: MESSAGE.CHAT_MESSAGE_SENT,
      data: { message },
    });
  } catch (error) {
    next(error);
  }
};

// Gia sư đánh dấu đã đọc cuộc trò chuyện
const markMyConversationRead = async (req, res, next) => {
  try {
    await chatService.markTutorRead(req.user.id);
    return successResponse(res, { message: MESSAGE.CHAT_MARK_READ_SUCCESS });
  } catch (error) {
    next(error);
  }
};

// Đếm số tin nhắn chưa đọc của gia sư
const getMyUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await chatService.getTutorUnreadCount(req.user.id);
    return successResponse(res, { message: MESSAGE.CHAT_UNREAD_COUNT_SUCCESS, data: { unreadCount } });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────── Admin ────────────────────────────

// Lấy danh sách cuộc trò chuyện cho admin
const getConversations = async (req, res, next) => {
  try {
    const result = await chatService.getAdminConversations(req.query);
    return successResponse(res, { message: MESSAGE.CHAT_CONVERSATIONS_SUCCESS, data: result });
  } catch (error) {
    next(error);
  }
};

// Lấy tin nhắn của một cuộc trò chuyện (admin)
const getConversationMessages = async (req, res, next) => {
  try {
    const result = await chatService.getAdminConversationMessages(req.params.id, req.query);
    return successResponse(res, { message: MESSAGE.CHAT_MESSAGES_SUCCESS, data: result });
  } catch (error) {
    next(error);
  }
};

// Admin gửi tin nhắn văn bản vào cuộc trò chuyện
const sendConversationMessage = async (req, res, next) => {
  try {
    const message = await chatService.sendMessageAsAdmin(req.params.id, req.user.id, {
      content: req.body.content,
    });
    return successResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: MESSAGE.CHAT_MESSAGE_SENT,
      data: { message },
    });
  } catch (error) {
    next(error);
  }
};

// Admin gửi tin nhắn kèm ảnh vào cuộc trò chuyện
const sendConversationImageMessage = async (req, res, next) => {
  try {
    const message = await chatService.sendMessageAsAdmin(req.params.id, req.user.id, {
      content: req.body.content,
      imageUrl: req.file?.path,
    });
    return successResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: MESSAGE.CHAT_MESSAGE_SENT,
      data: { message },
    });
  } catch (error) {
    next(error);
  }
};

// Admin gửi thẻ lớp/gia sư vào cuộc trò chuyện
const sendConversationCard = async (req, res, next) => {
  try {
    const message = await chatService.sendCardAsAdmin(req.params.id, req.user.id, {
      kind: req.body.kind,
      refId: req.body.refId,
    });
    return successResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: MESSAGE.CHAT_MESSAGE_SENT,
      data: { message },
    });
  } catch (error) {
    next(error);
  }
};

// Admin đánh dấu đã đọc cuộc trò chuyện
const markConversationRead = async (req, res, next) => {
  try {
    await chatService.markAdminRead(req.params.id);
    return successResponse(res, { message: MESSAGE.CHAT_MARK_READ_SUCCESS });
  } catch (error) {
    next(error);
  }
};

// Đếm tổng số tin nhắn chưa đọc của admin
const getAdminUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await chatService.getAdminUnreadTotal();
    return successResponse(res, { message: MESSAGE.CHAT_UNREAD_COUNT_SUCCESS, data: { unreadCount } });
  } catch (error) {
    next(error);
  }
};

// Mở hoặc tạo cuộc trò chuyện với một gia sư
const startConversation = async (req, res, next) => {
  try {
    const conversation = await chatService.startConversationWithTutor(req.body.tutorUserId);
    return successResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: MESSAGE.CHAT_CONVERSATION_OPENED,
      data: { conversation },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyConversation,
  sendMyMessage,
  sendMyImageMessage,
  markMyConversationRead,
  getMyUnreadCount,
  getConversations,
  getConversationMessages,
  sendConversationMessage,
  sendConversationImageMessage,
  sendConversationCard,
  markConversationRead,
  getAdminUnreadCount,
  startConversation,
};
