/**
 * Kiểm tra dữ liệu trùng trước khi tạo các unique index bảo vệ luồng trạng thái.
 * Mặc định chỉ audit; thêm --apply để tạo index sau khi dữ liệu sạch.
 *
 * Audit:
 *   node -r ./scripts/_atlasDns.js scripts/ensureConsistencyIndexes.js
 * Tạo index:
 *   node -r ./scripts/_atlasDns.js scripts/ensureConsistencyIndexes.js --apply
 */
require("dotenv").config();
const mongoose = require("mongoose");

mongoose.set("autoIndex", false);

const Review = require("../src/models/review.model");
const ProfileChangeRequest = require("../src/models/profileChangeRequest.model");
const { Payment } = require("../src/models/payment.model");
const { Notification } = require("../src/models/notification.model");
const OutboxEvent = require("../src/models/outboxEvent.model");
const { PROFILE_CHANGE_STATUS } = require("../src/constants/profileChangeRequest");
const { PAYMENT_STATUS } = require("../src/constants/payment");

const APPLY = process.argv.includes("--apply");

const duplicateGroups = (model, match, groupId) =>
  model.aggregate([
    { $match: match },
    { $group: { _id: groupId, count: { $sum: 1 }, ids: { $push: "$_id" } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 20 },
  ]);

const checks = [
  {
    label: "active reviews / class + reviewer",
    run: () => duplicateGroups(Review, { deletedAt: null }, { classId: "$classId", reviewerId: "$reviewerId" }),
  },
  {
    label: "pending profile changes / tutor",
    run: () => duplicateGroups(ProfileChangeRequest, { status: PROFILE_CHANGE_STATUS.PENDING }, "$tutorId"),
  },
  {
    label: "pending payments / application",
    run: () => duplicateGroups(Payment, { status: PAYMENT_STATUS.PENDING }, "$applicationId"),
  },
  {
    label: "notifications / eventKey",
    run: () => duplicateGroups(Notification, { eventKey: { $type: "string" } }, "$eventKey"),
  },
  {
    label: "outbox / dedupeKey",
    run: () => duplicateGroups(OutboxEvent, { dedupeKey: { $type: "string" } }, "$dedupeKey"),
  },
];

const indexes = [
  [Review, { classId: 1, reviewerId: 1 }, {
    name: "uniq_active_review_per_class_reviewer",
    unique: true,
    partialFilterExpression: { deletedAt: null },
  }],
  [ProfileChangeRequest, { tutorId: 1 }, {
    name: "uniq_pending_profile_change_per_tutor",
    unique: true,
    partialFilterExpression: { status: PROFILE_CHANGE_STATUS.PENDING },
  }],
  [Payment, { applicationId: 1 }, {
    name: "uniq_pending_payment_per_application",
    unique: true,
    partialFilterExpression: { status: PAYMENT_STATUS.PENDING },
  }],
  [Notification, { eventKey: 1 }, {
    name: "uniq_notification_event_key",
    unique: true,
    sparse: true,
  }],
  [OutboxEvent, { dedupeKey: 1 }, {
    name: "uniq_outbox_dedupe_key",
    unique: true,
  }],
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  let duplicateCount = 0;

  for (const check of checks) {
    const duplicates = await check.run();
    duplicateCount += duplicates.length;
    console.log(`${check.label}: ${duplicates.length} duplicate group(s)`);
    for (const duplicate of duplicates) {
      console.log(`  ${JSON.stringify(duplicate._id)} -> ${duplicate.count} records`);
    }
  }

  if (duplicateCount > 0) {
    throw new Error("Dữ liệu còn trùng; cần xử lý thủ công trước khi tạo unique index.");
  }
  if (!APPLY) {
    console.log("Audit sạch. Chạy lại với --apply để tạo index.");
    return;
  }

  for (const [model, keys, options] of indexes) {
    const name = await model.collection.createIndex(keys, options);
    console.log(`Created/verified index: ${name}`);
  }
};

run()
  .catch((error) => {
    console.error(`Consistency index setup failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
