class ConversationMapper {
  // Chuyển một cuộc trò chuyện thành DTO (viewerRole quyết định số chưa đọc theo phía nào)
  static toDTO(conversation, viewerRole = "tutor") {
    if (!conversation) {
      throw new Error("ConversationMapper.toDTO: conversation is required");
    }

    const tutor = conversation.tutorUserId;
    const tutorIsPopulated = tutor && typeof tutor === "object" && tutor._id;

    return {
      id: conversation._id,
      tutorUserId: tutorIsPopulated ? tutor._id : tutor,
      tutor: tutorIsPopulated
        ? {
            id: tutor._id,
            fullName: tutor.fullName,
            email: tutor.email,
            avatar: tutor.avatar,
          }
        : null,
      lastMessage: conversation.lastMessage || "",
      lastMessageAt: conversation.lastMessageAt,
      lastSenderRole: conversation.lastSenderRole,
      unreadCount: viewerRole === "admin" ? conversation.adminUnread || 0 : conversation.tutorUnread || 0,
      updatedAt: conversation.updatedAt,
    };
  }

  // Chuyển danh sách cuộc trò chuyện thành danh sách DTO
  static toDTOList(conversations, viewerRole = "tutor") {
    if (!Array.isArray(conversations)) return [];
    return conversations.map((c) => ConversationMapper.toDTO(c, viewerRole));
  }
}

module.exports = ConversationMapper;
