class MessageMapper {
  static toDTO(message) {
    if (!message) {
      throw new Error("MessageMapper.toDTO: message is required");
    }

    return {
      id: message._id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderRole: message.senderRole,
      content: message.content,
      imageUrl: message.imageUrl || null,
      card: message.card
        ? {
            kind: message.card.kind,
            refId: message.card.refId,
            title: message.card.title,
            subtitle: message.card.subtitle || null,
            image: message.card.image || null,
          }
        : null,
      createdAt: message.createdAt,
    };
  }

  static toDTOList(messages) {
    if (!Array.isArray(messages)) return [];
    return messages.map(MessageMapper.toDTO);
  }
}

module.exports = MessageMapper;
