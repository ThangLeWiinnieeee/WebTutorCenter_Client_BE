const { Payment } = require("../models/payment.model");
const { PAYMENT_STATUS } = require("../constants/payment");

// Chỉ cần mã lớp + môn để hiển thị hóa đơn — tránh kéo cả class doc.
const POPULATE_CLASS = "classCode subject";
// Nhóm theo giờ VN (GMT+7) để mốc ngày/tháng khớp múi giờ người dùng.
const TZ = "+07:00";

// Tạo bản ghi thanh toán mới
const create = async (data) => {
  const doc = new Payment(data);
  return await doc.save();
};

// Tìm giao dịch theo mã tham chiếu (txnRef)
const findByTxnRef = async (txnRef) => {
  return await Payment.findOne({ txnRef }).populate("classId", POPULATE_CLASS);
};

// Cập nhật một giao dịch theo id
const updateById = async (id, updateData) => {
  return await Payment.findByIdAndUpdate(id, updateData, { new: true });
};

// Một trang hóa đơn thanh toán phí nhận lớp của một gia sư (mới nhất trước).
const findByTutorUserIdPage = async (tutorUserId, { page = 1, limit = 10 } = {}) => {
  const skip = (Math.max(1, page) - 1) * limit;
  const [docs, totalItems] = await Promise.all([
    Payment.find({ tutorUserId })
      .populate("classId", POPULATE_CLASS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments({ tutorUserId }),
  ]);
  return { docs, totalItems };
};

// ── Admin: quản lý + thống kê thanh toán phí nhận lớp ──
const ADMIN_POPULATE_USER = "fullName email avatar";

// Một trang danh sách thanh toán cho admin (lọc theo trạng thái / cổng), mới nhất trước.
const findPageForAdmin = async ({ page = 1, limit = 10, status, provider } = {}) => {
  const filter = {};
  if (status && status !== "all") filter.status = status;
  if (provider && provider !== "all") filter.provider = provider;
  const skip = (Math.max(1, page) - 1) * limit;
  const [docs, totalItems] = await Promise.all([
    Payment.find(filter)
      .populate("classId", POPULATE_CLASS)
      .populate("tutorUserId", ADMIN_POPULATE_USER)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(filter),
  ]);
  return { docs, totalItems };
};

// Đếm + tổng tiền theo trạng thái (cho thẻ tóm tắt trang quản lý): [{ _id, count, amount }].
const aggregateStatusSummary = async () => {
  return await Payment.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amount" } } },
  ]);
};

// Doanh thu (phí nhận lớp THÀNH CÔNG) theo ngày kể từ `since` — [{ date:"YYYY-MM-DD", amount, count }].
const aggregateRevenueByDay = async (since) => {
  return await Payment.aggregate([
    { $match: { status: PAYMENT_STATUS.SUCCESS, paidAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt", timezone: TZ } },
        amount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $project: { _id: 0, date: "$_id", amount: 1, count: 1 } },
  ]);
};

// Doanh thu thành công theo tháng kể từ `since` — [{ month:"YYYY-MM", amount, count }].
const aggregateRevenueByMonth = async (since) => {
  return await Payment.aggregate([
    { $match: { status: PAYMENT_STATUS.SUCCESS, paidAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$paidAt", timezone: TZ } },
        amount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $project: { _id: 0, month: "$_id", amount: 1, count: 1 } },
  ]);
};

module.exports = {
  create,
  findByTxnRef,
  updateById,
  findByTutorUserIdPage,
  findPageForAdmin,
  aggregateStatusSummary,
  aggregateRevenueByDay,
  aggregateRevenueByMonth,
};
