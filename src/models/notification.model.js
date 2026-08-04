const mongoose = require("mongoose");
const { NOTIFICATION_TYPES, NOTIFICATION_AUDIENCE } = require("../constants/notification");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId là bắt buộc"],
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: [true, "Loại thông báo là bắt buộc"],
    },
    // Đối tượng nhận: "client" (mặc định) hiển thị ở chuông Header của người dùng;
    // "admin" hiển thị ở chuông riêng khu quản trị. Tài liệu cũ không có field này
    // được coi như "client" nhờ default → không phá vỡ dữ liệu hiện có.
    audience: {
      type: String,
      enum: Object.values(NOTIFICATION_AUDIENCE),
      default: NOTIFICATION_AUDIENCE.CLIENT,
      index: true,
    },
    message: {
      type: String,
      required: [true, "Nội dung thông báo là bắt buộc"],
      trim: true,
      maxlength: [500, "Nội dung thông báo không được vượt quá 500 ký tự"],
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    // Khóa idempotency từ outbox; direct notification không có field này.
    eventKey: {
      type: String,
      default: undefined,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: auto-delete documents 7 days after readAt is set
notificationSchema.index({ readAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
notificationSchema.index(
  { eventKey: 1 },
  { name: "uniq_notification_event_key", unique: true, sparse: true },
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = { Notification };
