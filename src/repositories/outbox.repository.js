const OutboxEvent = require("../models/outboxEvent.model");
const { OUTBOX_STATUS } = require("../constants/outbox");

const create = async (data, { session } = {}) => {
  const [event] = await OutboxEvent.create([data], { session });
  return event;
};

// Atomic claim cho phép nhiều replica cùng chạy worker mà không xử lý cùng một event.
const claimNext = async ({ staleBefore }) => {
  const now = new Date();
  return OutboxEvent.findOneAndUpdate(
    {
      availableAt: { $lte: now },
      $or: [
        { status: OUTBOX_STATUS.PENDING },
        { status: OUTBOX_STATUS.PROCESSING, lockedAt: { $lte: staleBefore } },
      ],
    },
    {
      $set: { status: OUTBOX_STATUS.PROCESSING, lockedAt: now },
      $inc: { attempts: 1 },
    },
    { new: true, sort: { createdAt: 1 } },
  );
};

const markProcessed = (id) =>
  OutboxEvent.updateOne(
    { _id: id, status: OUTBOX_STATUS.PROCESSING },
    { $set: {
      status: OUTBOX_STATUS.PROCESSED,
      processedAt: new Date(),
      lockedAt: null,
      lastError: null,
    } },
  );

const markRetry = (id, { error, availableAt, failed }) =>
  OutboxEvent.updateOne(
    { _id: id, status: OUTBOX_STATUS.PROCESSING },
    { $set: {
      status: failed ? OUTBOX_STATUS.FAILED : OUTBOX_STATUS.PENDING,
      availableAt,
      lockedAt: null,
      lastError: String(error || "Unknown outbox error").slice(0, 1000),
    } },
  );

module.exports = { create, claimNext, markProcessed, markRetry };
