const mongoose = require("mongoose");

// Phản hồi của gia sư cho một đánh giá. Mỗi đánh giá chỉ được gia sư phản hồi MỘT lần
// (để gia sư có cơ hội giải thích, vd khi bị đánh giá oan). Không có _id riêng.
const reviewReplySchema = new mongoose.Schema(
  {
    comment: {
      type: String,
      required: [true, "Nội dung phản hồi là bắt buộc"],
      trim: true,
      minlength: [2, "Phản hồi phải có ít nhất 2 ký tự"],
      maxlength: [1000, "Phản hồi không được vượt quá 1000 ký tự"],
    },
    repliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// Đánh giá gia sư của người đăng bài sau khi lớp đã hoàn thành (cả hai phía xác nhận).
// Mỗi lớp đã hoàn thành chỉ được người đăng đánh giá MỘT lần (kiểm tra ở service layer).
const reviewSchema = new mongoose.Schema(
  {
    // Gia sư được đánh giá (đơn nhận lớp đã được duyệt của lớp này)
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tutor",
      required: [true, "tutorId là bắt buộc"],
      index: true,
    },
    // Lớp (bài đăng) đã hoàn thành mà đánh giá này gắn với
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "classId là bắt buộc"],
      index: true,
    },
    // Người đăng bài (người tạo lớp) — người viết đánh giá
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "reviewerId là bắt buộc"],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, "Số sao đánh giá là bắt buộc"],
      min: [1, "Số sao tối thiểu là 1"],
      max: [5, "Số sao tối đa là 5"],
    },
    comment: {
      type: String,
      required: [true, "Nội dung nhận xét là bắt buộc"],
      trim: true,
      minlength: [5, "Nhận xét phải có ít nhất 5 ký tự"],
      maxlength: [1000, "Nhận xét không được vượt quá 1000 ký tự"],
    },
    // Phản hồi của gia sư cho đánh giá này (tối đa 1 lần). `null` = chưa phản hồi.
    reply: {
      type: reviewReplySchema,
      default: null,
    },
    // Xóa mềm: đưa đánh giá vào thùng rác (ẩn khỏi mọi thống kê/hiển thị) thay vì xóa hẳn
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Truy vấn danh sách đánh giá của một gia sư (sắp xếp mới nhất) thường lọc theo trạng thái xóa mềm
reviewSchema.index({ tutorId: 1, deletedAt: 1, createdAt: -1 });
// Tra cứu nhanh "lớp này người đăng đã đánh giá chưa"
reviewSchema.index(
  { classId: 1, reviewerId: 1 },
  {
    name: "uniq_active_review_per_class_reviewer",
    unique: true,
    partialFilterExpression: { deletedAt: null },
  },
);

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
