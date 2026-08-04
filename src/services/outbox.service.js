const outboxRepository = require("../repositories/outbox.repository");
const userRepository = require("../repositories/user.repository");
const notificationService = require("./notification.service");
const { OUTBOX_EVENT_TYPE } = require("../constants/outbox");
const { sendClassSelectionReminderEmail } = require("../utils/email");

const MAX_ATTEMPTS = 10;
const LOCK_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 5_000;

const enqueueNotification = async ({ dedupeKey, ...payload }, { session } = {}) => {
  if (!payload.userId) return null;
  return outboxRepository.create(
    { type: OUTBOX_EVENT_TYPE.NOTIFICATION_CREATE, payload, dedupeKey },
    { session },
  );
};

const enqueueClassSelectionReminderEmail = async (
  { dedupeKey, ...payload },
  { session } = {},
) => {
  if (!payload.userId) return null;
  return outboxRepository.create(
    { type: OUTBOX_EVENT_TYPE.CLASS_SELECTION_REMINDER_EMAIL, payload, dedupeKey },
    { session },
  );
};

const sendSelectionReminderEmail = async (payload) => {
  const user = await userRepository.findById(payload.userId);
  if (!user?.email) return;
  await sendClassSelectionReminderEmail({
    to: user.email,
    fullName: user.fullName || "bạn",
    classCode: payload.classCode,
    subject: payload.subject,
    startDate: payload.startDate,
  });
};

const processNext = async () => {
  const event = await outboxRepository.claimNext({
    staleBefore: new Date(Date.now() - LOCK_TIMEOUT_MS),
  });
  if (!event) return false;

  try {
    switch (event.type) {
      case OUTBOX_EVENT_TYPE.NOTIFICATION_CREATE:
        await notificationService.createNotification({
          ...event.payload,
          eventKey: event.dedupeKey,
        });
        break;
      case OUTBOX_EVENT_TYPE.CLASS_SELECTION_REMINDER_EMAIL:
        await sendSelectionReminderEmail(event.payload);
        break;
      default:
        throw new Error(`Unsupported outbox event type: ${event.type}`);
    }
    await outboxRepository.markProcessed(event._id);
  } catch (error) {
    const failed = event.attempts >= MAX_ATTEMPTS;
    const delayMs = Math.min(60_000, 1_000 * 2 ** Math.min(event.attempts, 6));
    await outboxRepository.markRetry(event._id, {
      error: error.message,
      availableAt: new Date(Date.now() + delayMs),
      failed,
    });
  }
  return true;
};

let running = false;
const drain = async () => {
  if (running) return;
  running = true;
  try {
    while (await processNext()) {
      // xử lý đến khi hàng đợi hiện tại rỗng
    }
  } finally {
    running = false;
  }
};

const startOutboxWorker = () => {
  const run = () => void drain().catch((error) => {
    console.error(`[outbox] ${error.message}`);
  });
  run();
  const timer = setInterval(run, POLL_INTERVAL_MS);
  timer.unref?.();
  return timer;
};

module.exports = {
  enqueueNotification,
  enqueueClassSelectionReminderEmail,
  processNext,
  startOutboxWorker,
};
