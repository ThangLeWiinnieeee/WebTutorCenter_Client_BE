const classRepository = require("../repositories/class.repository");
const classApplicationRepository = require("../repositories/class.application.repository");
const outboxService = require("../services/outbox.service");
const { NOTIFICATION_TYPES } = require("../constants/notification");
const { CLASS_STATUS } = require("../constants/class");
const { withTransaction } = require("./transaction");

const EXPIRY_INTERVAL_MS = 15 * 60 * 1000; // quét mỗi 15 phút
const FIRST_RUN_DELAY_MS = 15 * 1000; // chạy lần đầu sau 15s để DB ổn định
const SELECTION_REMINDER_WINDOW_MS = 2 * 24 * 60 * 60 * 1000; // nhắc khi còn <= 2 ngày tới ngày bắt đầu

// Định dạng ngày bắt đầu theo dd/mm/yyyy
const formatStartDate = (date) =>
  new Date(date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

// Đánh dấu hết hạn các lớp quá giờ chưa có gia sư nhận và báo cho người đăng
const expireOverdueClasses = async () => {
  const now = new Date();
  const activeClassIds = await classApplicationRepository.distinctActiveClassIds();
  const classes = await classRepository.findExpirableClasses(now, activeClassIds);

  let expired = 0;
  for (const cls of classes) {
    const didExpire = await withTransaction(async (session) => {
      const freshClass = await classRepository.findById(cls._id, { session });
      if (!freshClass || !freshClass.startDate || new Date(freshClass.startDate) > now) return false;
      if (await classApplicationRepository.findLockingByClassId(cls._id, { session })) return false;
      const updated = await classRepository.transitionStatus(
        cls._id,
        [CLASS_STATUS.OPEN, null],
        { $set: { status: CLASS_STATUS.EXPIRED } },
        { session },
      );
      if (!updated) return false;

      await outboxService.enqueueNotification({
        dedupeKey: `class:${cls._id}:expired`,
        userId: updated.createdBy,
        type: NOTIFICATION_TYPES.CLASS_EXPIRED,
        message: `Rất tiếc, lớp ${updated.classCode} (Môn: ${updated.subject}) đã tới thời gian bắt đầu nhưng chưa có gia sư nào nhận. Bạn vui lòng tạo bài đăng mới hoặc liên hệ admin để được hỗ trợ.`,
      }, { session });
      return true;
    });
    if (didExpire) expired += 1;
  }
  return expired;
};

// Nhắc người đăng chọn gia sư khi lớp sắp bắt đầu mà chưa chọn ai (chỉ nhắc 1 lần mỗi bài)
const remindUnselectedClasses = async () => {
  const now = new Date();
  const deadline = new Date(now.getTime() + SELECTION_REMINDER_WINDOW_MS);
  const chosenClassIds = await classApplicationRepository.distinctActiveClassIds();
  const classes = await classRepository.findSelectionReminderDueClasses(now, deadline, chosenClassIds);

  let reminded = 0;
  for (const cls of classes) {
    const didRemind = await withTransaction(async (session) => {
      if (await classApplicationRepository.findLockingByClassId(cls._id, { session })) return false;
      const updated = await classRepository.markSelectionReminderSent(
        cls._id,
        now,
        deadline,
        { session },
      );
      if (!updated) return false;
      await outboxService.enqueueNotification({
        dedupeKey: `class:${cls._id}:selection-reminder`,
        userId: updated.createdBy,
        type: NOTIFICATION_TYPES.CLASS_SELECTION_REMINDER,
        message: `Lớp ${updated.classCode} (Môn: ${updated.subject}) sẽ bắt đầu vào ${formatStartDate(updated.startDate)} nhưng bạn chưa chọn gia sư. Vui lòng chọn gia sư gấp để lớp có thể bắt đầu đúng hạn.`,
      }, { session });
      await outboxService.enqueueClassSelectionReminderEmail({
        dedupeKey: `class:${cls._id}:selection-reminder:email`,
        userId: updated.createdBy,
        classCode: updated.classCode,
        subject: updated.subject,
        startDate: updated.startDate,
      }, { session });
      return true;
    });
    if (didRemind) reminded += 1;
  }
  return reminded;
};

let running = false;
// Chạy một lượt quét: đánh dấu hết hạn + nhắc chọn gia sư (tránh chạy chồng)
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

// Khởi động scheduler quét vòng đời bài đăng định kỳ
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
