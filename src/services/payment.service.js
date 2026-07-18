const mongoose = require("mongoose");

const AppError = require("../utils/AppError");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");
const { PAYMENT_STATUS, computeClassFee } = require("../constants/payment");
const { CLASS_APPLICATION_STATUS } = require("../constants/classApplication");
const { NOTIFICATION_TYPES } = require("../constants/notification");
const paymentRepository = require("../repositories/payment.repository");
const classApplicationRepository = require("../repositories/class.application.repository");
const notificationService = require("./notification.service");
const { getProvider, listProviders } = require("./gateways");
const { PaymentMapper } = require("../mappers");
const { buildPagination } = require("../utils/pagination");

// Lấy danh sách cổng thanh toán đã cấu hình để gia sư chọn.
const getAvailableProviders = () => listProviders().filter((p) => p.configured);

// Khởi tạo thanh toán phí nhận lớp qua một cổng: kiểm tra điều kiện, tạo giao dịch pending, trả URL cổng.
const initiateClassFeePayment = async (userId, applicationId, { providerKey, ipAddr, returnUrl, ipnUrl }) => {
  const provider = getProvider(providerKey);
  if (!provider) throw new AppError(MESSAGE.PAYMENT_PROVIDER_INVALID, HTTP_STATUS.BAD_REQUEST);
  if (!provider.isConfigured()) {
    throw new AppError(MESSAGE.PAYMENT_CONFIG_MISSING, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  const application = await classApplicationRepository.findById(applicationId);
  if (!application) throw new AppError(MESSAGE.CLASS_APPLICATION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

  const tutorUserId = application.tutorId?.userId?._id ?? application.tutorId?.userId;
  if (String(tutorUserId) !== String(userId)) {
    throw new AppError(MESSAGE.CLASS_APPLICATION_NOT_FOUND, HTTP_STATUS.FORBIDDEN);
  }

  if (application.status !== CLASS_APPLICATION_STATUS.APPROVED) {
    throw new AppError(MESSAGE.PAYMENT_APPLICATION_NOT_APPROVED, HTTP_STATUS.BAD_REQUEST);
  }
  if (application.feePaid) {
    throw new AppError(MESSAGE.PAYMENT_ALREADY_PAID, HTTP_STATUS.BAD_REQUEST);
  }

  const classItem = application.classId || {};
  const amount = computeClassFee(classItem.finalFeePerMonth ?? classItem.feePerMonth);
  if (!amount || amount <= 0) {
    throw new AppError(MESSAGE.PAYMENT_INVALID_AMOUNT, HTTP_STATUS.BAD_REQUEST);
  }

  const txnRef = provider.makeTxnRef(new mongoose.Types.ObjectId().toString());
  // Gọi cổng trước, chỉ lưu giao dịch khi lấy được URL (tránh bản ghi pending mồ côi khi cổng lỗi)
  const paymentUrl = await provider.createPaymentUrl({
    amount,
    txnRef,
    orderInfo: `Thanh toan phi nhan lop ${classItem.classCode || ""}`.trim(),
    ipAddr,
    returnUrl,
    ipnUrl,
  });

  await paymentRepository.create({
    applicationId: application._id,
    classId: classItem._id ?? application.classId,
    tutorUserId: userId,
    amount,
    provider: provider.key,
    status: PAYMENT_STATUS.PENDING,
    txnRef,
  });

  return { paymentUrl, amount, provider: provider.key };
};

// Xử lý kết quả cổng trả về: đối chiếu số tiền + chữ ký, cập nhật trạng thái, mở khóa lớp, gửi thông báo.
const handleReturn = async (providerKey, query) => {
  const provider = getProvider(providerKey);
  if (!provider) return { status: "failed", classCode: null };

  const parsed = await provider.parseReturn(query);
  if (!parsed.txnRef) return { status: "failed", classCode: null };

  const payment = await paymentRepository.findByTxnRef(parsed.txnRef);
  if (!payment) return { status: "failed", classCode: null };

  const classCode = payment.classId?.classCode || "";
  // Đã xử lý rồi thì trả kết quả cũ, không thông báo lại (return/IPN có thể gọi trùng)
  if (payment.status !== PAYMENT_STATUS.PENDING) {
    return { status: payment.status === PAYMENT_STATUS.SUCCESS ? "success" : "failed", classCode };
  }

  const amountMatches = Number(parsed.amount) === Number(payment.amount);
  const paidOk = parsed.success && amountMatches;

  if (paidOk) {
    await paymentRepository.updateById(payment._id, {
      status: PAYMENT_STATUS.SUCCESS,
      gatewayResponseCode: parsed.responseCode ?? null,
      paidAt: new Date(),
    });
    await classApplicationRepository.update(payment.applicationId, { feePaid: true });
    await notificationService.createNotification({
      userId: payment.tutorUserId,
      type: NOTIFICATION_TYPES.CLASS_FEE_PAID,
      message: `Bạn đã chuyển tiền phí nhận lớp cho mã lớp ${classCode} thành công. Xem chi tiết trong "Hóa đơn thanh toán".`,
    });
    return { status: "success", classCode };
  }

  await paymentRepository.updateById(payment._id, {
    status: PAYMENT_STATUS.FAILED,
    gatewayResponseCode: parsed.responseCode ?? null,
  });
  await notificationService.createNotification({
    userId: payment.tutorUserId,
    type: NOTIFICATION_TYPES.CLASS_FEE_PAYMENT_FAILED,
    message: `Bạn đã thanh toán phí nhận lớp cho mã lớp ${classCode} thất bại. Vui lòng liên hệ admin nếu có lỗi.`,
  });
  return { status: "failed", classCode };
};

// Lấy lịch sử hóa đơn thanh toán phí nhận lớp của gia sư đang đăng nhập.
const getMyPayments = async (userId, query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const { docs, totalItems } = await paymentRepository.findByTutorUserIdPage(userId, { page, limit });
  return {
    payments: PaymentMapper.toDTOList(docs),
    pagination: buildPagination({ page, limit, totalItems }),
  };
};

module.exports = {
  getAvailableProviders,
  initiateClassFeePayment,
  handleReturn,
  getMyPayments,
};
