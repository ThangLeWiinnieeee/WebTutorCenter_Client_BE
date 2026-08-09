const mongoose = require("mongoose");
const ClassModel = require("../models/class.model");
const { CLASS_STATUS } = require("../constants/class");
const { GENDER_OPTIONS } = require("../constants/tutor");

// Các mức trình độ cụ thể mà bài đăng có thể yêu cầu (ngoài "any")
const SPECIFIC_TUTOR_LEVELS = ["student", "teacher"];

// Mặc định mọi truy vấn đọc đều bỏ qua bài đăng đã xóa mềm (nằm trong thùng rác)
const NOT_DELETED = { deletedAt: null };

// Bài đăng "còn hiển thị" ở feed/danh sách công khai: chưa bị ghép, hết hạn hoặc đã hoàn thành.
// Dùng $nin nên cũng khớp các bài cũ chưa có field `status` (legacy) — coi như đang mở.
const VISIBLE_STATUS = {
  status: { $nin: [CLASS_STATUS.MATCHED, CLASS_STATUS.EXPIRED, CLASS_STATUS.COMPLETED] },
};

// Dựng bộ lọc feed cá nhân hoá cho gia sư (môn + giới tính + trình độ + khu vực)
const buildFeedMatchFilter = ({ subjects, genderPrefs, levelPrefs, provinceCode } = {}) => {
  // requestedTutorId: null → ẩn lớp mời gia sư trực tiếp khỏi feed công khai
  const filter = { ...NOT_DELETED, ...VISIBLE_STATUS, requestedTutorId: null };

  if (subjects?.length) filter.subject = { $in: subjects };
  if (provinceCode != null) filter.provinceCode = provinceCode;

  if (genderPrefs?.length) {
    const rejected = GENDER_OPTIONS.filter((g) => !genderPrefs.includes(g));
    if (rejected.length) filter.tutorGenderPref = { $nin: rejected };
  }

  if (levelPrefs?.length) {
    const rejected = SPECIFIC_TUTOR_LEVELS.filter((l) => !levelPrefs.includes(l));
    if (rejected.length) filter.tutorLevelPref = { $nin: rejected };
  }

  return filter;
};

// Tạo bài đăng lớp mới
const create = async (payload, { session } = {}) => {
  const doc = new ClassModel(payload);
  return await doc.save({ session });
};

// Tìm một bài đăng theo id (bỏ bài đã xoá mềm)
const findById = async (id, { session } = {}) => {
  return await ClassModel.findOne({ _id: id, ...NOT_DELETED }).session(session || null).lean();
};

// Kiểm tra trùng mã lớp — phải xét cả bài đăng đã xóa mềm để tránh tái dùng mã
const findByClassCode = async (classCode) => {
  return await ClassModel.findOne({ classCode }).lean();
};

// Lấy danh sách bài đăng công khai (lọc, phân trang, ẩn lớp mời/đã khoá)
const findMany = async (filters = {}, options = {}) => {
  const page = options.page || 1;
  const limit = options.limit || 6;
  const skip = (page - 1) * limit;
  // requestedTutorId: null → ẩn lớp mời gia sư trực tiếp khỏi danh sách công khai
  const queryFilters = { ...NOT_DELETED, ...VISIBLE_STATUS, requestedTutorId: null, ...filters };
  // Ẩn các lớp đã có đơn nhận (pending/approved/cancel_requested) — đồng bộ với feed gia sư
  if (options.excludeIds?.length) queryFilters._id = { $nin: options.excludeIds };

  const [classes, totalItems] = await Promise.all([
    ClassModel.find(queryFilters).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ClassModel.countDocuments(queryFilters),
  ]);

  return { classes, totalItems };
};

// Lấy bài đăng khớp tiêu chí feed của gia sư, sắp theo điểm quan tâm rồi bài mới nhất
// ponytail: sort chạy trên field tính động (_affinity) nên là in-memory sort trên tập đã lọc;
// đủ ở quy mô hiện tại, cân nhắc precompute nếu số bài đăng lên rất lớn.
const findByFeedCriteria = async (criteria = {}, options = {}) => {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;
  const filters = buildFeedMatchFilter(criteria);
  // $match trong aggregate KHÔNG tự cast string → ObjectId như find → phải tự chuyển excludeIds
  if (options.excludeIds?.length) {
    filters._id = { $nin: options.excludeIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  const branches = Object.entries(options.affinity || {})
    .filter(([, score]) => Number(score) > 0)
    .map(([subject, score]) => ({ case: { $eq: ["$subject", subject] }, then: Number(score) }));
  const affinityExpr = branches.length ? { $switch: { branches, default: 0 } } : 0;

  const [classes, totalItems] = await Promise.all([
    ClassModel.aggregate([
      { $match: filters },
      { $addFields: { _affinity: affinityExpr } },
      { $sort: { _affinity: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: { _affinity: 0 } },
    ]),
    ClassModel.countDocuments(filters),
  ]);

  return { classes, totalItems };
};

// Đếm số bài đăng mới (tạo từ thời điểm `since`) khớp tiêu chí cá nhân hóa
const countByFeedCriteriaSince = async (criteria = {}, since, excludeIds = []) => {
  const filter = buildFeedMatchFilter(criteria);
  filter.createdAt = { $gte: since };
  if (excludeIds.length) filter._id = { $nin: excludeIds };
  return await ClassModel.countDocuments(filter);
};

// Cập nhật trạng thái vòng đời của một bài đăng
const updateStatus = async (id, status) => {
  return await ClassModel.findByIdAndUpdate(id, { status }, { new: true }).lean();
};

const transitionStatus = async (id, expectedStatus, updateData, { session } = {}) => {
  const status = Array.isArray(expectedStatus) ? { $in: expectedStatus } : expectedStatus;
  return ClassModel.findOneAndUpdate(
    { _id: id, status, ...NOT_DELETED },
    updateData,
    { new: true, session },
  ).lean();
};

// CAS guard đồng thời ghi updatedAt để các transaction trên lớp cùng tranh chấp một document.
const guardOpen = async (id, { session } = {}) => {
  return ClassModel.findOneAndUpdate(
    { _id: id, status: CLASS_STATUS.OPEN, ...NOT_DELETED },
    { $set: { updatedAt: new Date() } },
    { new: true, session },
  ).lean();
};

const guardMatched = async (id, { session } = {}) => {
  return ClassModel.findOneAndUpdate(
    { _id: id, status: CLASS_STATUS.MATCHED, ...NOT_DELETED },
    { $set: { updatedAt: new Date() } },
    { new: true, session },
  ).lean();
};

const confirmCompletionBy = async (id, field, { session } = {}) => {
  return ClassModel.findOneAndUpdate(
    { _id: id, status: CLASS_STATUS.MATCHED, [field]: { $ne: true }, ...NOT_DELETED },
    { $set: { [field]: true } },
    { new: true, session },
  ).lean();
};

const markSelectionReminderSent = async (id, now, deadline, { session } = {}) => {
  return ClassModel.findOneAndUpdate(
    {
      _id: id,
      status: CLASS_STATUS.OPEN,
      selectionReminderSentAt: null,
      startDate: { $gt: now, $lte: deadline },
      ...NOT_DELETED,
    },
    { $set: { selectionReminderSentAt: now } },
    { new: true, session },
  ).lean();
};

// Cập nhật một số field của bài đăng (vd cờ hoàn thành)
const update = async (id, data) => {
  return await ClassModel.findByIdAndUpdate(id, data, { new: true }).lean();
};

// Lấy bài đăng cần đánh dấu hết hạn (đã tới giờ bắt đầu, còn mở, không có đơn)
const findExpirableClasses = async (now, excludeIds = []) => {
  const filter = {
    ...NOT_DELETED,
    ...VISIBLE_STATUS,
    startDate: { $lte: now },
  };
  if (excludeIds.length) filter._id = { $nin: excludeIds };
  return await ClassModel.find(filter).lean();
};

// Lấy bài đăng cần nhắc chọn gia sư (sắp bắt đầu, còn mở, chưa từng nhắc)
const findSelectionReminderDueClasses = async (now, deadline, excludeIds = []) => {
  const filter = {
    ...NOT_DELETED,
    status: CLASS_STATUS.OPEN,
    selectionReminderSentAt: null,
    startDate: { $gt: now, $lte: deadline },
  };
  if (excludeIds.length) filter._id = { $nin: excludeIds };
  return await ClassModel.find(filter).lean();
};

// Danh sách bài đăng cho admin (có lọc + populate người đăng)
const findManyForAdmin = async (filters = {}, options = {}) => {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;
  const queryFilters = { ...NOT_DELETED, ...filters };

  const [classes, totalItems] = await Promise.all([
    ClassModel.find(queryFilters)
      .populate("createdBy", "fullName email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ClassModel.countDocuments(queryFilters),
  ]);

  return { classes, totalItems };
};

// Lấy chi tiết một bài đăng kèm thông tin người đăng
const findByIdPopulated = async (id) => {
  return await ClassModel.findOne({ _id: id, ...NOT_DELETED })
    .populate("createdBy", "fullName email avatar")
    .lean();
};

// Xóa mềm: đưa bài đăng vào thùng rác
const softDelete = async (id, adminUserId) => {
  return await ClassModel.findOneAndUpdate(
    { _id: id, ...NOT_DELETED },
    { deletedAt: new Date(), deletedBy: adminUserId },
    { new: true },
  ).lean();
};

// Khôi phục bài đăng khỏi thùng rác
const restore = async (id) => {
  return await ClassModel.findOneAndUpdate(
    { _id: id, deletedAt: { $ne: null } },
    { deletedAt: null, deletedBy: null },
    { new: true },
  ).lean();
};

// Danh sách bài đăng trong thùng rác (đã xóa mềm)
const findDeleted = async (options = {}) => {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;
  const filters = { deletedAt: { $ne: null } };

  const [classes, totalItems] = await Promise.all([
    ClassModel.find(filters)
      .populate("createdBy", "fullName email avatar")
      .sort({ deletedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ClassModel.countDocuments(filters),
  ]);

  return { classes, totalItems };
};

// Xóa vĩnh viễn (hard delete) — chỉ áp dụng cho bài đăng đang ở thùng rác
const deleteById = async (id) => {
  return await ClassModel.findOneAndDelete({ _id: id, deletedAt: { $ne: null } }).lean();
};

// Xóa vĩnh viễn theo id (không cần ở thùng rác) — dùng cho chủ bài đăng tự xóa
const hardDelete = async (id) => {
  return await ClassModel.findByIdAndDelete(id).lean();
};

// Danh sách bài đăng do một người dùng tạo (bài đăng tìm gia sư của họ)
const findByCreatedBy = async (userId, options = {}) => {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;
  const filters = { ...NOT_DELETED, createdBy: userId };

  const [classes, totalItems] = await Promise.all([
    ClassModel.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ClassModel.countDocuments(filters),
  ]);

  return { classes, totalItems };
};

// Lấy id tất cả bài đăng của một người dùng (KỂ CẢ đã xóa mềm) — phục vụ xóa vĩnh viễn tài khoản
const findAllIdsByCreatedBy = async (userId) => {
  const docs = await ClassModel.find({ createdBy: userId }).select("_id").lean();
  return docs.map((d) => d._id);
};

// Xóa toàn bộ bài đăng của một người dùng (dùng khi xóa vĩnh viễn tài khoản)
const deleteAllByCreatedBy = async (userId) => {
  return await ClassModel.deleteMany({ createdBy: userId });
};

const renameSubject = async (oldName, newName, { session } = {}) => {
  return ClassModel.updateMany({ subject: oldName }, { $set: { subject: newName } }, { session });
};

// Số bài đăng (không tính đã xóa mềm) theo ngày kể từ `since` — cho biểu đồ thống kê.
const aggregateCountByDay = async (since) => {
  return await ClassModel.aggregate([
    { $match: { deletedAt: null, createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+07:00" } },
        count: { $sum: 1 },
      },
    },
    { $project: { _id: 0, date: "$_id", count: 1 } },
  ]);
};

module.exports = {
  aggregateCountByDay,
  create,
  findById,
  findByClassCode,
  findMany,
  findByFeedCriteria,
  countByFeedCriteriaSince,
  updateStatus,
  transitionStatus,
  guardOpen,
  guardMatched,
  confirmCompletionBy,
  markSelectionReminderSent,
  update,
  findExpirableClasses,
  findSelectionReminderDueClasses,
  findByCreatedBy,
  findManyForAdmin,
  findByIdPopulated,
  softDelete,
  restore,
  findDeleted,
  deleteById,
  hardDelete,
  findAllIdsByCreatedBy,
  deleteAllByCreatedBy,
  renameSubject,
};
