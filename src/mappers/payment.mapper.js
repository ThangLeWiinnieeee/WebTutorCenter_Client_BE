const { PAYMENT_PROVIDER_LABELS } = require("../constants/payment");

class PaymentMapper {
  // Chuyển một giao dịch thành DTO
  static toDTO(payment) {
    if (!payment) return null;
    const classItem = payment.classId || {};

    return {
      id: payment._id,
      amount: payment.amount,
      provider: payment.provider || "vnpay",
      providerLabel: PAYMENT_PROVIDER_LABELS[payment.provider] || "VNPay",
      status: payment.status,
      txnRef: payment.txnRef,
      gatewayResponseCode: payment.gatewayResponseCode ?? null,
      paidAt: payment.paidAt ?? null,
      createdAt: payment.createdAt,
      classItem: {
        id: classItem._id ?? payment.classId,
        classCode: classItem.classCode ?? null,
        subject: classItem.subject ?? null,
      },
    };
  }

  // Chuyển danh sách giao dịch thành danh sách DTO
  static toDTOList(payments) {
    if (!Array.isArray(payments)) return [];
    return payments.map((p) => this.toDTO(p));
  }

  // DTO cho admin quản lý — kèm thông tin gia sư trả phí (tutorUserId đã populate).
  static toAdminDTO(payment) {
    if (!payment) return null;
    const classItem = payment.classId || {};
    const tutor = payment.tutorUserId || {};

    return {
      id: payment._id,
      amount: payment.amount,
      provider: payment.provider || "vnpay",
      providerLabel: PAYMENT_PROVIDER_LABELS[payment.provider] || "VNPay",
      status: payment.status,
      txnRef: payment.txnRef,
      gatewayResponseCode: payment.gatewayResponseCode ?? null,
      paidAt: payment.paidAt ?? null,
      createdAt: payment.createdAt,
      tutor: {
        id: tutor._id ?? null,
        fullName: tutor.fullName ?? null,
        email: tutor.email ?? null,
        avatar: tutor.avatar ?? null,
      },
      classItem: {
        id: classItem._id ?? payment.classId,
        classCode: classItem.classCode ?? null,
        subject: classItem.subject ?? null,
      },
    };
  }

  // Chuyển danh sách giao dịch thành danh sách DTO cho admin
  static toAdminDTOList(payments) {
    if (!Array.isArray(payments)) return [];
    return payments.map((p) => this.toAdminDTO(p));
  }
}

module.exports = PaymentMapper;
