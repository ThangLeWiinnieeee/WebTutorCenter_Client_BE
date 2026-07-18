const mongoose = require("mongoose");
const { PAYMENT_STATUS, PAYMENT_PROVIDERS } = require("../constants/payment");

// Một lần gia sư thanh toán phí nhận lớp qua cổng VNPay. Mỗi lần bấm thanh toán tạo 1 bản ghi
// → làm lịch sử hóa đơn cho gia sư (thất bại rồi trả lại thì có nhiều bản ghi cho cùng 1 lớp).
const paymentSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassApplication",
      required: true,
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    // Tài khoản gia sư trả phí (để lọc hóa đơn "của tôi")
    tutorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    // Cổng thanh toán đã dùng cho giao dịch này
    provider: {
      type: String,
      enum: Object.values(PAYMENT_PROVIDERS),
      default: PAYMENT_PROVIDERS.VNPAY,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    // Mã tham chiếu giao dịch gửi sang VNPay (vnp_TxnRef) — duy nhất để đối soát khi cổng trả về
    txnRef: {
      type: String,
      required: true,
      unique: true,
    },
    // Mã kết quả VNPay trả về (vnp_ResponseCode); "00" = thành công
    gatewayResponseCode: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ createdAt: -1 });

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = { Payment };
