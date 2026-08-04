const mongoose = require("mongoose");

const AppError = require("../utils/AppError");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");
const { PAYMENT_STATUS, computeClassFee } = require("../constants/payment");
const { CLASS_APPLICATION_STATUS } = require("../constants/classApplication");
const { NOTIFICATION_TYPES } = require("../constants/notification");
const paymentRepository = require("../repositories/payment.repository");
const classApplicationRepository = require("../repositories/class.application.repository");
const outboxService = require("./outbox.service");
const { getProvider, listProviders } = require("./gateways");
const { PaymentMapper } = require("../mappers");
const { buildPagination } = require("../utils/pagination");
const { withTransaction } = require("../utils/transaction");

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
  let payment;
  try {
    payment = await withTransaction(async (session) => {
      const payable = await classApplicationRepository.guardFeePayment(
        application._id,
        { session },
      );
      if (!payable) {
        throw new AppError(MESSAGE.PAYMENT_ALREADY_PAID, HTTP_STATUS.CONFLICT);
      }
      return paymentRepository.create({
        applicationId: application._id,
        classId: classItem._id ?? application.classId,
        tutorUserId: userId,
        amount,
        provider: provider.key,
        status: PAYMENT_STATUS.PENDING,
        txnRef,
      }, { session });
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError(MESSAGE.PAYMENT_PENDING_EXISTS, HTTP_STATUS.CONFLICT);
    }
    throw error;
  }

  let paymentUrl;
  try {
    paymentUrl = await provider.createPaymentUrl({
      amount,
      txnRef,
      orderInfo: `Thanh toan phi nhan lop ${classItem.classCode || ""}`.trim(),
      ipAddr,
      returnUrl,
      ipnUrl,
    });
  } catch (error) {
    await paymentRepository.transitionStatus(payment._id, PAYMENT_STATUS.PENDING, {
      $set: { status: PAYMENT_STATUS.FAILED },
    });
    throw error;
  }

  return { paymentUrl, amount, provider: provider.key };
};

// Xử lý kết quả cổng trả về: đối chiếu số tiền + chữ ký, cập nhật trạng thái, mở khóa lớp, gửi thông báo.
const handleReturn = async (providerKey, query) => {
  const provider = getProvider(providerKey);
  if (!provider) return { status: "failed", classCode: null };

  const parsed = await provider.parseReturn(query);
  if (!parsed.txnRef) return { status: "failed", classCode: null };

  return withTransaction(async (session) => {
    const payment = await paymentRepository.findByTxnRef(parsed.txnRef, { session });
    if (!payment) return { status: "failed", classCode: null };

    const classCode = payment.classId?.classCode || "";
    if (payment.status !== PAYMENT_STATUS.PENDING) {
      return {
        status: payment.status === PAYMENT_STATUS.SUCCESS ? "success" : "failed",
        classCode,
      };
    }

    const amountMatches = Number(parsed.amount) === Number(payment.amount);
    const paidOk = parsed.success && amountMatches;
    const nextStatus = paidOk ? PAYMENT_STATUS.SUCCESS : PAYMENT_STATUS.FAILED;
    const updatedPayment = await paymentRepository.transitionStatus(
      payment._id,
      PAYMENT_STATUS.PENDING,
      {
        $set: {
          status: nextStatus,
          gatewayResponseCode: parsed.responseCode ?? null,
          ...(paidOk ? { paidAt: new Date() } : {}),
        },
      },
      { session },
    );
    if (!updatedPayment) return { status: "failed", classCode };

    if (paidOk) {
      const application = await classApplicationRepository.markFeePaid(
        payment.applicationId,
        { session },
      );
      if (!application) {
        throw new AppError(MESSAGE.PAYMENT_APPLICATION_NOT_APPROVED, HTTP_STATUS.CONFLICT);
      }
    }

    await outboxService.enqueueNotification({
      dedupeKey: `payment:${payment._id}:${nextStatus}`,
      userId: payment.tutorUserId,
      type: paidOk
        ? NOTIFICATION_TYPES.CLASS_FEE_PAID
        : NOTIFICATION_TYPES.CLASS_FEE_PAYMENT_FAILED,
      message: paidOk
        ? `Bạn đã chuyển tiền phí nhận lớp cho mã lớp ${classCode} thành công. Xem chi tiết trong "Hóa đơn thanh toán".`
        : `Bạn đã thanh toán phí nhận lớp cho mã lớp ${classCode} thất bại. Vui lòng liên hệ admin nếu có lỗi.`,
    }, { session });

    return { status: paidOk ? "success" : "failed", classCode };
  });
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
