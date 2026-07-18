const paymentRepository = require("../repositories/payment.repository");
const { PaymentMapper } = require("../mappers");
const { buildPagination } = require("../utils/pagination");
const { PAYMENT_STATUS } = require("../constants/payment");

// Danh sách thanh toán phí nhận lớp cho admin quản lý (lọc trạng thái/cổng) + thẻ tóm tắt.
const getPayments = async (query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const { status, provider } = query;

  const [{ docs, totalItems }, statusSummary] = await Promise.all([
    paymentRepository.findPageForAdmin({ page, limit, status, provider }),
    paymentRepository.aggregateStatusSummary(),
  ]);

  const counts = { all: 0, pending: 0, success: 0, failed: 0 };
  let totalRevenue = 0;
  for (const row of statusSummary) {
    counts[row._id] = row.count;
    counts.all += row.count;
    if (row._id === PAYMENT_STATUS.SUCCESS) totalRevenue += row.amount;
  }

  return {
    payments: PaymentMapper.toAdminDTOList(docs),
    pagination: buildPagination({ page, limit, totalItems }),
    counts,
    totalRevenue,
  };
};

module.exports = { getPayments };
