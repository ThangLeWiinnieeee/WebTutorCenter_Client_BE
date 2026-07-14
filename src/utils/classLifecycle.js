const classRepository = require("../repositories/class.repository");
const classApplicationRepository = require("../repositories/class.application.repository");
const notificationService = require("../services/notification.service");
const { NOTIFICATION_TYPES } = require("../constants/notification");
const { CLASS_STATUS } = require("../constants/class");

const EXPIRY_INTERVAL_MS = 15 * 60 * 1000; // quét mỗi 15 phút
const FIRST_RUN_DELAY_MS = 15 * 1000; // chạy lần đầu sau 15s để DB ổn định
const SELECTION_REMINDER_WINDOW_MS = 2 * 24 * 60 * 60 * 1000; // nhắc khi còn <= 2 ngày tới ngày bắt đầu

const formatStartDate = (date) =>
  new Date(date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

// Đánh dấu hết hạn các bài đăng đã tới giờ học mà chưa có gia sư nhận, và báo cho người đăng.
// Bỏ qua các lớp đang có đơn (pending/approved/cancel_requested) — vẫn còn cơ hội được ghép.
const expireOverdueClasses = async () => {
  const activeClassIds = await classApplicationRepository.distinctActiveClassIds();
  const classes = await classRepository.findExpirableClasses(new Date(), activeClassIds);

  let expired = 0;
  for (const cls of classes) {
    await classRepository.updateStatus(cls._id, CLASS_STATUS.EXPIRED);
    const posterId = cls.createdBy?._id ?? cls.createdBy;
    if (posterId) {
      await notificationService.createNotification({
        userId: posterId,
        type: NOTIFICATION_TYPES.CLASS_EXPIRED,
        message: `Rất tiếc, lớp ${cls.classCode} (Môn: ${cls.subject}) đã tới thời gian bắt đầu nhưng chưa có gia sư nào nhận. Bạn vui lòng tạo bài đăng mới hoặc liên hệ admin để được hỗ trợ.`,
      });
    }
    expired += 1;
  }
  return expired;
};

// Nhắc người đăng chọn gia sư gấp khi lớp sắp bắt đầu (còn <= 2 ngày) mà vẫn chưa chọn ai.
// "Chưa chọn" = lớp còn mở và không có đơn selected/approved/cancel_requested (distinctActiveClassIds).
// Đánh dấu selectionReminderSentAt để chỉ nhắc 1 lần cho mỗi bài đăng.
const remindUnselectedClasses = async () => {
  const now = new Date();
  const deadline = new Date(now.getTime() + SELECTION_REMINDER_WINDOW_MS);
  const chosenClassIds = await classApplicationRepository.distinctActiveClassIds();
  const classes = await classRepository.findSelectionReminderDueClasses(now, deadline, chosenClassIds);

  let reminded = 0;
  for (const cls of classes) {
    // Đánh dấu trước để không nhắc lại ở lần quét sau (kể cả khi tạo notification lỗi giữa chừng)
    await classRepository.update(cls._id, { selectionReminderSentAt: now });
    const posterId = cls.createdBy?._id ?? cls.createdBy;
    if (posterId) {
      await notificationService.createNotification({
        userId: posterId,
        type: NOTIFICATION_TYPES.CLASS_SELECTION_REMINDER,
        message: `Lớp ${cls.classCode} (Môn: ${cls.subject}) sẽ bắt đầu vào ${formatStartDate(cls.startDate)} nhưng bạn chưa chọn gia sư. Vui lòng chọn gia sư gấp để lớp có thể bắt đầu đúng hạn.`,
      });
    }
    reminded += 1;
  }
  return reminded;
};

let running = false;
const runExpirySweep = async () => {
  if (running) return; // tránh chạy chồng nếu lần trước chưa xong
  running = true;
  try {
    const count = await expireOverdueClasses();
    if (count > 0) console.log(`[classLifecycle] Đã đánh dấu hết hạn ${count} bài đăng.`);
    const reminded = await remindUnselectedClasses();
    if (reminded > 0) console.log(`[classLifecycle] Đã nhắc chọn gia sư cho ${reminded} bài đăng.`);
  } catch (err) {
    console.error("[classLifecycle] Lỗi khi quét vòng đời bài đăng:", err.message);
  } finally {
    running = false;
  }
};

const startClassLifecycleScheduler = () => {
  setTimeout(runExpirySweep, FIRST_RUN_DELAY_MS);
  const timer = setInterval(runExpirySweep, EXPIRY_INTERVAL_MS);
  if (typeof timer.unref === "function") timer.unref(); // không giữ tiến trình sống chỉ vì timer
  return timer;
};

module.exports = {
  expireOverdueClasses,
  remindUnselectedClasses,
  runExpirySweep,
  startClassLifecycleScheduler,
};
