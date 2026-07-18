const { ClassApplication } = require("../models/class.application.model");
const {
  CLASS_APPLICATION_STATUS,
  CLASS_APPLICATION_ORIGIN,
} = require("../constants/classApplication");

// Đầy đủ các field bài đăng mà mapper/khu vực admin cần để hiển thị chi tiết.
const POPULATE_CLASS =
  "classCode subject summary description locationLabel provinceCode districtCode provinceName districtName contactPhone feePerSession feePerMonth finalFeePerMonth promoCode promoDiscount sessionsPerWeek minutesPerSession studentCount studentGender startDate availabilitySlots tutorGenderPref tutorLevelPref status createdBy createdAt";
const POPULATE_TUTOR_USER = "fullName email avatar gender";

// Lớp đã "khóa" khỏi feed/danh sách công khai: người đăng đã chọn gia sư (selected),
// đã ghép (approved) hoặc đang xin hủy (cancel_requested). Lưu ý: PENDING KHÔNG khóa —
// lớp vẫn nhận thêm gia sư ứng tuyển cho tới khi người đăng chọn.
const LOCK_STATUSES = [
  CLASS_APPLICATION_STATUS.SELECTED,
  CLASS_APPLICATION_STATUS.APPROVED,
  CLASS_APPLICATION_STATUS.CANCEL_REQUESTED,
];

// Đơn "đang hoạt động" của một bài đăng (gồm cả pending) — dùng để khóa sửa/xóa bài.
const ACTIVE_STATUSES = [
  CLASS_APPLICATION_STATUS.PENDING,
  CLASS_APPLICATION_STATUS.SELECTED,
  CLASS_APPLICATION_STATUS.APPROVED,
  CLASS_APPLICATION_STATUS.CANCEL_REQUESTED,
];

// Tạo đơn nhận lớp mới
const create = async (data) => {
  const doc = new ClassApplication(data);
  return await doc.save();
};

// Lấy chi tiết một đơn nhận lớp (kèm lớp và gia sư)
const findById = async (id) => {
  return await ClassApplication.findById(id)
    .populate("classId", POPULATE_CLASS)
    .populate({
      path: "tutorId",
      populate: { path: "userId", select: POPULATE_TUTOR_USER },
    });
};

// Tìm đơn nhận lớp theo lớp và gia sư
const findByClassAndTutor = async (classId, tutorId) => {
  return await ClassApplication.findOne({ classId, tutorId }).lean();
};

// Đơn đã được duyệt (gia sư đang nhận) của một lớp — để xác định gia sư đã ghép
const findApprovedByClassId = async (classId) => {
  return await ClassApplication.findOne({
    classId,
    status: CLASS_APPLICATION_STATUS.APPROVED,
  }).populate({
    path: "tutorId",
    populate: { path: "userId", select: POPULATE_TUTOR_USER },
  });
};

// Tìm đơn đang khoá một lớp (đã chọn/ghép/xin huỷ gia sư)
const findLockingByClassId = async (classId) => {
  return await ClassApplication.findOne({
    classId,
    status: { $in: LOCK_STATUSES },
  }).lean();
};

// Đơn đã được duyệt cho NHIỀU bài đăng cùng lúc — để hiển thị gia sư đã ghép trong
// "Bài đăng của tôi" mà không cần truy vấn lặp từng lớp (tránh N+1).
const findApprovedByClassIds = async (classIds = []) => {
  if (!classIds.length) return [];
  return await ClassApplication.find({
    classId: { $in: classIds },
    status: CLASS_APPLICATION_STATUS.APPROVED,
  }).populate({
    path: "tutorId",
    populate: { path: "userId", select: POPULATE_TUTOR_USER },
  });
};

// Lấy danh sách classId đã khoá (đã chọn/ghép/xin huỷ gia sư) để ẩn khỏi danh sách công khai
const distinctActiveClassIds = async () => {
  return await ClassApplication.distinct("classId", { status: { $in: LOCK_STATUSES } });
};

// Danh sách classId mà MỘT gia sư đã ứng tuyển (còn hiệu lực) — để ẩn khỏi feed của
// chính gia sư đó (tránh ứng tuyển lại lớp đang chờ/đang xử lý).
const distinctClassIdsByTutor = async (tutorId) => {
  return await ClassApplication.distinct("classId", {
    tutorId,
    status: {
      $in: [
        CLASS_APPLICATION_STATUS.PENDING,
        CLASS_APPLICATION_STATUS.SELECTED,
        CLASS_APPLICATION_STATUS.APPROVED,
      ],
    },
  });
};

// Danh sách classId có bất kỳ đơn đang hoạt động (gồm pending) — để khóa sửa/xóa bài.
const distinctClassIdsWithActiveApplications = async () => {
  return await ClassApplication.distinct("classId", { status: { $in: ACTIVE_STATUSES } });
};

// Lấy danh sách gia sư ứng tuyển một bài đăng (sắp theo số lớp đã dạy giảm dần)
const findApplicantsByClassId = async (classId) => {
  const docs = await ClassApplication.find({
    classId,
    origin: CLASS_APPLICATION_ORIGIN.APPLY, // chỉ gia sư tự ứng tuyển; loại lời mời trực tiếp
    status: {
      $in: [
        CLASS_APPLICATION_STATUS.PENDING,
        CLASS_APPLICATION_STATUS.SELECTED,
        CLASS_APPLICATION_STATUS.REJECTED,
        CLASS_APPLICATION_STATUS.APPROVED,
      ],
    },
  }).populate({
    path: "tutorId",
    populate: { path: "userId", select: POPULATE_TUTOR_USER },
  });

  return docs.sort(
    (a, b) => (b.tutorId?.totalClassesAccepted || 0) - (a.tutorId?.totalClassesAccepted || 0),
  );
};

// Các đơn ứng tuyển còn lại của một bài đăng (pending/selected) ngoại trừ đơn được chọn —
// dùng để đánh dấu "không được chọn" khi admin duyệt, và để báo cho các gia sư đó.
const findPeersToReject = async (classId, exceptApplicationId) => {
  return await ClassApplication.find({
    classId,
    _id: { $ne: exceptApplicationId },
    status: { $in: [CLASS_APPLICATION_STATUS.PENDING, CLASS_APPLICATION_STATUS.SELECTED] },
  }).populate({
    path: "tutorId",
    populate: { path: "userId", select: POPULATE_TUTOR_USER },
  });
};

// Đưa các đơn đang SELECTED khác (ngoài đơn vừa chọn) của một bài đăng về lại PENDING —
// dùng khi người đăng đổi lựa chọn sang gia sư khác.
const resetOtherSelectedToPending = async (classId, exceptApplicationId) => {
  return await ClassApplication.updateMany(
    { classId, _id: { $ne: exceptApplicationId }, status: CLASS_APPLICATION_STATUS.SELECTED },
    { status: CLASS_APPLICATION_STATUS.PENDING },
  );
};

// Đánh dấu nhiều đơn → not_selected (các ứng viên không được chọn khi lớp đã ghép)
const markNotSelected = async (applicationIds = []) => {
  if (!applicationIds.length) return { modifiedCount: 0 };
  return await ClassApplication.updateMany(
    { _id: { $in: applicationIds } },
    { status: CLASS_APPLICATION_STATUS.NOT_SELECTED },
  );
};

// Một trang đơn nhận lớp của gia sư (lọc theo trạng thái nếu có), mới nhất trước.
const findByTutorIdPage = async (tutorId, { status, page = 1, limit = 10 }) => {
  const filter = { tutorId };
  if (status && status !== "all") filter.status = status;
  const skip = (Math.max(1, page) - 1) * limit;
  return await ClassApplication.find(filter)
    .populate("classId")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Đếm số đơn theo trạng thái cho một gia sư (phục vụ badge số lượng các tab).
const countByTutorIdGrouped = async (tutorId) => {
  const [pending, selected, approved, rejected, notSelected, cancelRequested, cancelled] =
    await Promise.all([
      ClassApplication.countDocuments({ tutorId, status: CLASS_APPLICATION_STATUS.PENDING }),
      ClassApplication.countDocuments({ tutorId, status: CLASS_APPLICATION_STATUS.SELECTED }),
      ClassApplication.countDocuments({ tutorId, status: CLASS_APPLICATION_STATUS.APPROVED }),
      ClassApplication.countDocuments({ tutorId, status: CLASS_APPLICATION_STATUS.REJECTED }),
      ClassApplication.countDocuments({ tutorId, status: CLASS_APPLICATION_STATUS.NOT_SELECTED }),
      ClassApplication.countDocuments({ tutorId, status: CLASS_APPLICATION_STATUS.CANCEL_REQUESTED }),
      ClassApplication.countDocuments({ tutorId, status: CLASS_APPLICATION_STATUS.CANCELLED }),
    ]);
  return {
    pending,
    selected,
    approved,
    rejected,
    not_selected: notSelected,
    cancel_requested: cancelRequested,
    cancelled,
  };
};

// ── Admin: quản lý đơn bị hủy / yêu cầu hủy ──
const CANCELLATION_STATUSES = [
  CLASS_APPLICATION_STATUS.CANCEL_REQUESTED,
  CLASS_APPLICATION_STATUS.CANCELLED,
];

// Lấy một trang đơn huỷ/yêu cầu huỷ cho admin
const findCancellationsPage = async ({ status, page = 1, limit = 10 }) => {
  const filter =
    status && status !== "all" ? { status } : { status: { $in: CANCELLATION_STATUSES } };
  const skip = (Math.max(1, page) - 1) * limit;
  return await ClassApplication.find(filter)
    .populate("classId", POPULATE_CLASS)
    .populate({
      path: "tutorId",
      populate: { path: "userId", select: POPULATE_TUTOR_USER },
    })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Đếm số đơn huỷ theo trạng thái (yêu cầu huỷ / đã huỷ)
const countCancellationsGrouped = async () => {
  const [cancelRequested, cancelled] = await Promise.all([
    ClassApplication.countDocuments({ status: CLASS_APPLICATION_STATUS.CANCEL_REQUESTED }),
    ClassApplication.countDocuments({ status: CLASS_APPLICATION_STATUS.CANCELLED }),
  ]);
  return { cancel_requested: cancelRequested, cancelled };
};

// Một trang đơn nhận lớp theo trạng thái (admin duyệt nhận lớp), mới nhất trước.
// origin (optional): "apply" | "invite" để admin chia 2 mục.
const findByStatusPage = async ({ status, origin, page = 1, limit = 10 }) => {
  const filter = status && status !== "all" ? { status } : {};
  if (origin) filter.origin = origin;
  const skip = (Math.max(1, page) - 1) * limit;
  return await ClassApplication.find(filter)
    .populate("classId", POPULATE_CLASS)
    .populate({
      path: "tutorId",
      populate: { path: "userId", select: POPULATE_TUTOR_USER },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Đếm số đơn nhận lớp theo trạng thái (tuỳ chọn lọc theo origin)
const countAll = async (origin) => {
  const base = origin ? { origin } : {};
  const [pending, selected, approved, rejected] = await Promise.all([
    ClassApplication.countDocuments({ ...base, status: CLASS_APPLICATION_STATUS.PENDING }),
    ClassApplication.countDocuments({ ...base, status: CLASS_APPLICATION_STATUS.SELECTED }),
    ClassApplication.countDocuments({ ...base, status: CLASS_APPLICATION_STATUS.APPROVED }),
    ClassApplication.countDocuments({ ...base, status: CLASS_APPLICATION_STATUS.REJECTED }),
  ]);
  return { pending, selected, approved, rejected };
};

// ── Luồng mời gia sư trực tiếp ──
// Lời mời của một gia sư (mặc định đang chờ phản hồi: INVITED), kèm chi tiết lớp.
const findInvitationsByTutor = async (tutorId, { status, page = 1, limit = 10 } = {}) => {
  const filter = { tutorId, origin: CLASS_APPLICATION_ORIGIN.INVITE };
  if (status && status !== "all") filter.status = status;
  const skip = (Math.max(1, page) - 1) * limit;
  const [docs, totalItems] = await Promise.all([
    ClassApplication.find(filter)
      .populate("classId", POPULATE_CLASS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ClassApplication.countDocuments(filter),
  ]);
  return { docs, totalItems };
};

// Đơn mời (origin=invite) cho nhiều bài đăng cùng lúc — để hiển thị kết quả mời trong
// "Bài đăng của tôi" (gia sư được mời + trạng thái + lý do từ chối).
const findInviteByClassIds = async (classIds = []) => {
  if (!classIds.length) return [];
  return await ClassApplication.find({
    classId: { $in: classIds },
    origin: CLASS_APPLICATION_ORIGIN.INVITE,
  }).populate({
    path: "tutorId",
    populate: { path: "userId", select: POPULATE_TUTOR_USER },
  });
};

// Cập nhật một đơn nhận lớp
const update = async (id, updateData) => {
  return await ClassApplication.findByIdAndUpdate(id, updateData, { new: true })
    .populate("classId", POPULATE_CLASS)
    .populate({
      path: "tutorId",
      populate: { path: "userId", select: POPULATE_TUTOR_USER },
    });
};

// Đơn đang chờ ADMIN duyệt nhận lớp = đã được người đăng chọn (SELECTED).
// Khác với đơn PENDING (gia sư mới ứng tuyển, chưa được chọn) — đó chưa phải việc của admin.
const countSelected = async () => {
  return await ClassApplication.countDocuments({ status: CLASS_APPLICATION_STATUS.SELECTED });
};

// Đếm số đơn "đang hoạt động" của một bài đăng (pending/selected/approved/cancel_requested).
// Dùng để chặn chủ bài đăng sửa/xóa khi đã có gia sư ứng tuyển hoặc nhận lớp.
const countActiveByClassId = async (classId) => {
  return await ClassApplication.countDocuments({ classId, status: { $in: ACTIVE_STATUSES } });
};

// Đếm số đơn nhận lớp của một bài đăng (theo trạng thái nếu có)
const countByClassId = async (classId, status) => {
  const filter = { classId };
  if (status && status !== "all") filter.status = status;
  return await ClassApplication.countDocuments(filter);
};

// Đếm số đơn nhận lớp cho nhiều bài đăng cùng lúc → trả về map { classId: count }
const countByClassIds = async (classIds = []) => {
  if (!classIds.length) return {};
  const rows = await ClassApplication.aggregate([
    { $match: { classId: { $in: classIds } } },
    { $group: { _id: "$classId", count: { $sum: 1 } } },
  ]);
  return rows.reduce((acc, row) => {
    acc[String(row._id)] = row.count;
    return acc;
  }, {});
};

// Đếm số gia sư đang ứng tuyển (chờ chọn / đã chọn) cho nhiều bài đăng → map { classId: count }.
// Dùng cho nút "Gia sư ứng tuyển (N)" của người đăng.
const countActiveApplicantsByClassIds = async (classIds = []) => {
  if (!classIds.length) return {};
  const rows = await ClassApplication.aggregate([
    {
      $match: {
        classId: { $in: classIds },
        // Chỉ đếm gia sư tự ứng tuyển (origin=apply); lời mời trực tiếp hiển thị riêng
        origin: CLASS_APPLICATION_ORIGIN.APPLY,
        status: { $in: [CLASS_APPLICATION_STATUS.PENDING, CLASS_APPLICATION_STATUS.SELECTED] },
      },
    },
    { $group: { _id: "$classId", count: { $sum: 1 } } },
  ]);
  return rows.reduce((acc, row) => {
    acc[String(row._id)] = row.count;
    return acc;
  }, {});
};

// Xóa toàn bộ đơn nhận lớp thuộc một bài đăng (dùng khi admin xóa bài đăng)
const deleteByClassId = async (classId) => {
  return await ClassApplication.deleteMany({ classId });
};

// Xóa đơn nhận lớp thuộc nhiều bài đăng (xóa vĩnh viễn tài khoản người đăng)
const deleteByClassIds = async (classIds) => {
  return await ClassApplication.deleteMany({ classId: { $in: classIds } });
};

// Xóa toàn bộ đơn nhận lớp của một gia sư (xóa vĩnh viễn tài khoản gia sư)
const deleteByTutorId = async (tutorId) => {
  return await ClassApplication.deleteMany({ tutorId });
};

module.exports = {
  create,
  findById,
  findByClassAndTutor,
  findApprovedByClassId,
  findLockingByClassId,
  findApprovedByClassIds,
  distinctActiveClassIds,
  distinctClassIdsByTutor,
  distinctClassIdsWithActiveApplications,
  findApplicantsByClassId,
  findPeersToReject,
  resetOtherSelectedToPending,
  markNotSelected,
  findByTutorIdPage,
  countByTutorIdGrouped,
  findCancellationsPage,
  countCancellationsGrouped,
  findByStatusPage,
  findInvitationsByTutor,
  findInviteByClassIds,
  update,
  countSelected,
  countAll,
  countActiveByClassId,
  countByClassId,
  countByClassIds,
  countActiveApplicantsByClassIds,
  deleteByClassId,
  deleteByClassIds,
  deleteByTutorId,
};
