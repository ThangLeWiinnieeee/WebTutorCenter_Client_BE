const mongoose = require("mongoose");
const {
  CLASS_APPLICATION_STATUS,
  CLASS_APPLICATION_ORIGIN,
} = require("../constants/classApplication");

const classApplicationSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tutor",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(CLASS_APPLICATION_STATUS),
      default: CLASS_APPLICATION_STATUS.PENDING,
      index: true,
    },
    origin: {
      type: String,
      enum: Object.values(CLASS_APPLICATION_ORIGIN),
      default: CLASS_APPLICATION_ORIGIN.APPLY,
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    // Luồng mới: sau khi admin duyệt (approved), gia sư phải THANH TOÁN phí nhận lớp mới được
    // mở khóa thông tin chi tiết lớp/liên hệ. false = đã duyệt nhưng chưa trả phí (hiện nút thanh toán).
    feePaid: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

classApplicationSchema.index({ classId: 1, tutorId: 1 }, { unique: true });
classApplicationSchema.index({ createdAt: -1 });

const ClassApplication = mongoose.model("ClassApplication", classApplicationSchema);

module.exports = { ClassApplication };
