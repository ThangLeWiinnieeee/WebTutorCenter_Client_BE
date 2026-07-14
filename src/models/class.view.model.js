const mongoose = require("mongoose");
const { SUBJECT_AFFINITY } = require("../constants/tutor");

// Ghi dấu "gia sư (userId) đã xem lớp (classId)" — chỉ phục vụ chống cộng điểm quan tâm lặp lại
// khi mở đi mở lại cùng một lớp. KHÔNG dùng cho nghiệp vụ nào khác.
// - Unique (userId, classId): mỗi cặp chỉ tồn tại 1 bản ghi → lần xem đầu tiên là lần insert thành công.
// - TTL trên createdAt: bản ghi tự xóa sau VIEW_DEDUP_TTL_MS để không phình collection.
const classViewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  createdAt: { type: Date, default: Date.now },
});

classViewSchema.index({ userId: 1, classId: 1 }, { unique: true });
classViewSchema.index({ createdAt: 1 }, { expireAfterSeconds: SUBJECT_AFFINITY.VIEW_DEDUP_TTL_MS / 1000 });

module.exports = mongoose.model("ClassView", classViewSchema);
