const mongoose = require("mongoose");
const { CHAT_ROLES, CHAT_CARD_KINDS } = require("../constants/chat");

// Thẻ thông tin đính kèm (do admin gửi): chỉ chứa dữ liệu công khai + id để mở trang
// chi tiết. Không lưu thông tin nhạy cảm (SĐT, giấy tờ...) — xem chat.service.buildCard.
const cardSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: Object.values(CHAT_CARD_KINDS), required: true },
    refId: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: null, trim: true },
    image: { type: String, default: null },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: [true, "conversationId là bắt buộc"],
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "senderId là bắt buộc"],
    },
    // Vai trò người gửi tại thời điểm gửi (gia sư hoặc admin) — để render bố cục
    // trái/phải mà không cần so sánh id ở FE.
    senderRole: {
      type: String,
      enum: Object.values(CHAT_ROLES),
      required: [true, "senderRole là bắt buộc"],
    },
    // Nội dung text. Không bắt buộc khi tin nhắn chỉ có ảnh — ràng buộc "phải có
    // text hoặc ảnh" được kiểm ở service.
    content: {
      type: String,
      default: "",
      trim: true,
      maxlength: [2000, "Nội dung tin nhắn không được vượt quá 2000 ký tự"],
    },
    // URL ảnh đính kèm (Cloudinary), null nếu là tin nhắn text thuần.
    imageUrl: {
      type: String,
      default: null,
    },
    // Thẻ thông tin gia sư/bài đăng do admin đính kèm, null nếu tin nhắn thường.
    card: {
      type: cardSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Lấy tin nhắn theo cuộc trò chuyện, mới nhất trước (rồi đảo lại khi trả về).
messageSchema.index({ conversationId: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

module.exports = { Message };
