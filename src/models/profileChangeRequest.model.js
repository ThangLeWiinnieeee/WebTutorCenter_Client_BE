const mongoose = require("mongoose");
const { PROFILE_CHANGE_STATUS } = require("../constants/profileChangeRequest");

// Yêu cầu gia sư đổi thông tin hồ sơ — chờ admin duyệt trước khi áp dụng vào Tutor.
// `changes` chỉ chứa các field được phép sửa (whitelist ở service).
const profileChangeRequestSchema = new mongoose.Schema(
  {
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tutor",
      required: [true, "tutorId là bắt buộc"],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId là bắt buộc"],
      index: true,
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "Nội dung thay đổi là bắt buộc"],
    },
    status: {
      type: String,
      enum: Object.values(PROFILE_CHANGE_STATUS),
      default: PROFILE_CHANGE_STATUS.PENDING,
      index: true,
    },
    rejectionReason: {
      type: String,
      default: null,
      trim: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

profileChangeRequestSchema.index(
  { tutorId: 1 },
  {
    name: "uniq_pending_profile_change_per_tutor",
    unique: true,
    partialFilterExpression: { status: PROFILE_CHANGE_STATUS.PENDING },
  },
);

const ProfileChangeRequest = mongoose.model("ProfileChangeRequest", profileChangeRequestSchema);

module.exports = ProfileChangeRequest;
