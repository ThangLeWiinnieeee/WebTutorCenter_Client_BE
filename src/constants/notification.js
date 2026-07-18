const NOTIFICATION_TYPES = {
  TUTOR_PENDING: "TUTOR_PENDING",
  TUTOR_APPROVED: "TUTOR_APPROVED",
  TUTOR_REJECTED: "TUTOR_REJECTED",
  CLASS_APPLICATION_PENDING: "CLASS_APPLICATION_PENDING",
  CLASS_APPLICATION_APPROVED: "CLASS_APPLICATION_APPROVED",
  CLASS_APPLICATION_REJECTED: "CLASS_APPLICATION_REJECTED",
  // Người đăng chọn gia sư (gửi cho gia sư được chọn + admin để duyệt)
  CLASS_APPLICATION_SELECTED: "CLASS_APPLICATION_SELECTED",
  // Gia sư không được người đăng chọn (gửi cho các gia sư còn lại khi lớp đã ghép)
  CLASS_APPLICATION_NOT_SELECTED: "CLASS_APPLICATION_NOT_SELECTED",
  PROFILE_CHANGE_PENDING: "PROFILE_CHANGE_PENDING",
  PROFILE_CHANGE_APPROVED: "PROFILE_CHANGE_APPROVED",
  PROFILE_CHANGE_REJECTED: "PROFILE_CHANGE_REJECTED",
  CLASS_APPLICATION_CANCELLED: "CLASS_APPLICATION_CANCELLED",
  CLASS_APPLICATION_CANCEL_REQUESTED: "CLASS_APPLICATION_CANCEL_REQUESTED",
  CLASS_APPLICATION_CANCEL_APPROVED: "CLASS_APPLICATION_CANCEL_APPROVED",
  CLASS_APPLICATION_CANCEL_REJECTED: "CLASS_APPLICATION_CANCEL_REJECTED",
  // Vòng đời bài đăng (gửi cho người đăng)
  CLASS_MATCHED: "CLASS_MATCHED",
  CLASS_EXPIRED: "CLASS_EXPIRED",
  // Nhắc người đăng chọn gia sư gấp khi lớp sắp bắt đầu (<= 2 ngày) mà chưa chọn ai
  CLASS_SELECTION_REMINDER: "CLASS_SELECTION_REMINDER",
  // Hoàn thành lớp → tặng mã giảm giá (gửi cho cả người đăng và gia sư)
  CLASS_COMPLETED_REWARD: "CLASS_COMPLETED_REWARD",
  // Gia sư nhận được đánh giá mới từ người đăng (sau khi lớp hoàn thành)
  REVIEW_RECEIVED: "REVIEW_RECEIVED",
  // Gửi cho người đăng (người viết đánh giá) khi gia sư phản hồi đánh giá của họ
  REVIEW_REPLIED: "REVIEW_REPLIED",
  // Luồng mời gia sư trực tiếp
  // Gửi cho gia sư khi người đăng mời họ dạy một lớp
  CLASS_INVITE_RECEIVED: "CLASS_INVITE_RECEIVED",
  // Gửi cho người đăng khi gia sư đồng ý lời mời (chờ admin duyệt)
  CLASS_INVITE_ACCEPTED: "CLASS_INVITE_ACCEPTED",
  // Gửi cho người đăng khi gia sư từ chối lời mời (kèm lý do)
  CLASS_INVITE_DECLINED: "CLASS_INVITE_DECLINED",
  // Thanh toán phí nhận lớp (gửi cho gia sư)
  // Chuyển phí thành công → mở khóa thông tin lớp; bấm vào xem hóa đơn thanh toán
  CLASS_FEE_PAID: "CLASS_FEE_PAID",
  // Chuyển phí thất bại → nhắc liên hệ admin, nút thanh toán vẫn còn để thử lại
  CLASS_FEE_PAYMENT_FAILED: "CLASS_FEE_PAYMENT_FAILED",
};

// Đối tượng nhận thông báo — quyết định thông báo hiển thị ở chuông nào.
// "client": nghiệp vụ phía người dùng (gia sư/học viên/người đăng) — chuông ở Header.
// "admin": việc cần quản trị viên xử lý (duyệt hồ sơ, duyệt nhận lớp, ...) — chuông riêng khu admin.
const NOTIFICATION_AUDIENCE = {
  CLIENT: "client",
  ADMIN: "admin",
};

module.exports = { NOTIFICATION_TYPES, NOTIFICATION_AUDIENCE };
