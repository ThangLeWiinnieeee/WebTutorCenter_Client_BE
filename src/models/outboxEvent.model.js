const mongoose = require("mongoose");
const { OUTBOX_EVENT_TYPE, OUTBOX_STATUS } = require("../constants/outbox");

const outboxEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(OUTBOX_EVENT_TYPE),
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    dedupeKey: {
      type: String,
      required: true,
      maxlength: 200,
    },
    status: {
      type: String,
      enum: Object.values(OUTBOX_STATUS),
      default: OUTBOX_STATUS.PENDING,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    availableAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
      maxlength: 1000,
    },
  },
  { timestamps: true },
);

outboxEventSchema.index({ status: 1, availableAt: 1, createdAt: 1 });
outboxEventSchema.index(
  { dedupeKey: 1 },
  { name: "uniq_outbox_dedupe_key", unique: true },
);
outboxEventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = mongoose.model("OutboxEvent", outboxEventSchema);
