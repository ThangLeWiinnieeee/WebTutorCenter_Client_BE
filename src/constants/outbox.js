const OUTBOX_EVENT_TYPE = {
  NOTIFICATION_CREATE: "notification.create",
  CLASS_SELECTION_REMINDER_EMAIL: "class.selection-reminder.email",
};

const OUTBOX_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  PROCESSED: "processed",
  FAILED: "failed",
};

module.exports = { OUTBOX_EVENT_TYPE, OUTBOX_STATUS };
