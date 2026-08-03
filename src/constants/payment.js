// Trạng thái một lần thanh toán phí nhận lớp qua cổng.
const PAYMENT_STATUS = {
  PENDING: "pending", // đã tạo giao dịch, chờ kết quả từ cổng
  SUCCESS: "success", // cổng báo thanh toán thành công
  FAILED: "failed", // cổng báo thất bại / người dùng hủy
};

// Các cổng thanh toán sandbox được hỗ trợ (mỗi cổng là 1 provider trong services/gateways).
const PAYMENT_PROVIDERS = {
  VNPAY: "vnpay",
  MOMO: "momo",
  ZALOPAY: "zalopay",
};

const PAYMENT_PROVIDER_LABELS = {
  vnpay: "VNPay",
  momo: "MoMo",
  zalopay: "ZaloPay",
};

// Phí nhận lớp gia sư phải trả = 12% học phí tháng đầu (finalFeePerMonth) của lớp.
// ponytail: quy tắc phí để 1 chỗ; đổi tỉ lệ hoặc thay bằng phí cố định ở đúng dòng này.
const CLASS_FEE_RATE = 0.12;

// Tính phí nhận lớp từ học phí/tháng (làm tròn tới 1.000đ cho số tiền "đẹp").
const computeClassFee = (feePerMonth = 0) => {
  const raw = (Number(feePerMonth) || 0) * CLASS_FEE_RATE;
  return Math.max(0, Math.round(raw / 1000) * 1000);
};

module.exports = {
  PAYMENT_STATUS,
  PAYMENT_PROVIDERS,
  PAYMENT_PROVIDER_LABELS,
  CLASS_FEE_RATE,
  computeClassFee,
};
