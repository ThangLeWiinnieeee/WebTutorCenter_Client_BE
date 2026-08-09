const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const Review = require("../src/models/review.model");
const ProfileChangeRequest = require("../src/models/profileChangeRequest.model");
const { Payment } = require("../src/models/payment.model");
const { Notification } = require("../src/models/notification.model");
const OutboxEvent = require("../src/models/outboxEvent.model");
const { ClassApplication } = require("../src/models/class.application.model");
const ClassModel = require("../src/models/class.model");

const classApplicationRepository = require("../src/repositories/class.application.repository");
const classRepository = require("../src/repositories/class.repository");
const subjectRepository = require("../src/repositories/subject.repository");
const tutorRepository = require("../src/repositories/tutor.repository");
const paymentRepository = require("../src/repositories/payment.repository");
const outboxRepository = require("../src/repositories/outbox.repository");
const outboxService = require("../src/services/outbox.service");
const MESSAGE = require("../src/constants/message");
const {
  getClassApplicationEligibilityError,
} = require("../src/services/class.application.service");
const { withTransaction } = require("../src/utils/transaction");
const subjectService = require("../src/services/subject.service");

const findIndex = (schema, name) => schema.indexes().find(([, options]) => options.name === name);

test("critical unique indexes are declared with the intended scope", () => {
  const reviewIndex = findIndex(Review.schema, "uniq_active_review_per_class_reviewer");
  assert.deepEqual(reviewIndex[0], { classId: 1, reviewerId: 1 });
  assert.equal(reviewIndex[1].unique, true);
  assert.deepEqual(reviewIndex[1].partialFilterExpression, { deletedAt: null });

  const profileIndex = findIndex(
    ProfileChangeRequest.schema,
    "uniq_pending_profile_change_per_tutor",
  );
  assert.equal(profileIndex[1].unique, true);
  assert.deepEqual(profileIndex[1].partialFilterExpression, { status: "pending" });

  const paymentIndex = findIndex(Payment.schema, "uniq_pending_payment_per_application");
  assert.equal(paymentIndex[1].unique, true);
  assert.deepEqual(paymentIndex[1].partialFilterExpression, { status: "pending" });

  assert.equal(findIndex(Notification.schema, "uniq_notification_event_key")[1].unique, true);
  assert.equal(findIndex(OutboxEvent.schema, "uniq_outbox_dedupe_key")[1].unique, true);
});

test("class application transition uses status as a CAS condition", async () => {
  const original = ClassApplication.findOneAndUpdate;
  let captured;
  ClassApplication.findOneAndUpdate = (filter, update, options) => {
    captured = { filter, update, options };
    return Promise.resolve({ _id: "application" });
  };
  try {
    const session = { id: "session" };
    await classApplicationRepository.transitionStatus(
      "application-id",
      "pending",
      { status: "selected" },
      { session },
    );
    assert.deepEqual(captured.filter, { _id: "application-id", status: "pending" });
    assert.equal(captured.options.session, session);
  } finally {
    ClassApplication.findOneAndUpdate = original;
  }
});

test("class lifecycle transition uses status and soft-delete guards", async () => {
  const original = ClassModel.findOneAndUpdate;
  let captured;
  ClassModel.findOneAndUpdate = (filter, update, options) => {
    captured = { filter, update, options };
    return { lean: () => Promise.resolve({ _id: "class" }) };
  };
  try {
    await classRepository.transitionStatus("class-id", "open", { status: "matched" });
    assert.deepEqual(captured.filter, {
      _id: "class-id",
      status: "open",
      deletedAt: null,
    });
  } finally {
    ClassModel.findOneAndUpdate = original;
  }
});

test("payment callback transition only updates a pending payment", async () => {
  const original = Payment.findOneAndUpdate;
  let captured;
  Payment.findOneAndUpdate = (filter, update, options) => {
    captured = { filter, update, options };
    return Promise.resolve({ _id: "payment" });
  };
  try {
    await paymentRepository.transitionStatus("payment-id", "pending", { status: "success" });
    assert.deepEqual(captured.filter, { _id: "payment-id", status: "pending" });
  } finally {
    Payment.findOneAndUpdate = original;
  }
});

test("notification outbox keeps its dedupe key and session", async () => {
  const original = outboxRepository.create;
  let captured;
  outboxRepository.create = async (data, options) => {
    captured = { data, options };
    return data;
  };
  try {
    const session = { id: "session" };
    await outboxService.enqueueNotification(
      {
        dedupeKey: "application:1:approved",
        userId: "user-id",
        type: "class_application_approved",
        message: "ok",
      },
      { session },
    );
    assert.equal(captured.data.dedupeKey, "application:1:approved");
    assert.equal(captured.data.type, "notification.create");
    assert.equal(captured.options.session, session);
  } finally {
    outboxRepository.create = original;
  }
});

test("selection reminder email outbox keeps business data and session", async () => {
  const original = outboxRepository.create;
  let captured;
  outboxRepository.create = async (data, options) => {
    captured = { data, options };
    return data;
  };
  try {
    const session = { id: "session" };
    await outboxService.enqueueClassSelectionReminderEmail(
      {
        dedupeKey: "class:1:selection-reminder:email",
        userId: "poster-id",
        classCode: "CLS001",
        subject: "Toán",
        startDate: new Date("2030-01-03T00:00:00.000Z"),
      },
      { session },
    );
    assert.equal(captured.data.type, "class.selection-reminder.email");
    assert.equal(captured.data.dedupeKey, "class:1:selection-reminder:email");
    assert.equal(captured.data.payload.userId, "poster-id");
    assert.equal(captured.options.session, session);
  } finally {
    outboxRepository.create = original;
  }
});

test("class application eligibility matches gender and normalized tutor level", () => {
  const classItem = {
    subject: "Toán",
    tutorGenderPref: "female",
    tutorLevelPref: "teacher",
  };
  const tutor = { subjects: ["Toán"], occupationStatus: "graduated" };

  assert.equal(
    getClassApplicationEligibilityError(classItem, tutor, { gender: "female" }),
    null,
  );
  assert.equal(
    getClassApplicationEligibilityError(classItem, tutor, { gender: "male" }),
    MESSAGE.CLASS_APPLICATION_GENDER_MISMATCH,
  );
  assert.equal(
    getClassApplicationEligibilityError(classItem, { ...tutor, occupationStatus: "student" }, {
      gender: "female",
    }),
    MESSAGE.CLASS_APPLICATION_LEVEL_MISMATCH,
  );
});

test("transaction helper always closes its Mongo session", async () => {
  const original = mongoose.startSession;
  let ended = false;
  mongoose.startSession = async () => ({
    withTransaction: async (callback) => callback(),
    endSession: async () => {
      ended = true;
    },
  });
  try {
    const result = await withTransaction(async (session) => {
      assert.ok(session);
      return "done";
    });
    assert.equal(result, "done");
    assert.equal(ended, true);
  } finally {
    mongoose.startSession = original;
  }
});

test("đổi tên môn cập nhật subject, tutor và class trong cùng transaction", async () => {
  const originals = {
    startSession: mongoose.startSession,
    findById: subjectRepository.findById,
    existsByName: subjectRepository.existsByName,
    updateById: subjectRepository.updateById,
    renameTutorSubject: tutorRepository.renameSubject,
    renameClassSubject: classRepository.renameSubject,
  };
  const session = { id: "subject-session" };
  const calls = [];

  mongoose.startSession = async () => ({
    ...session,
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  });
  subjectRepository.findById = async (id, options) => {
    assert.equal(options.session.id, session.id);
    return { _id: id, name: "Toán", isActive: true, order: 1 };
  };
  subjectRepository.existsByName = async (name, id, options) => {
    assert.equal(options.session.id, session.id);
    return false;
  };
  subjectRepository.updateById = async (id, update, options) => {
    assert.equal(options.session.id, session.id);
    return { _id: id, name: update.name, isActive: true, order: 1 };
  };
  tutorRepository.renameSubject = async (oldName, newName, options) => {
    calls.push(["tutor", oldName, newName, options.session.id]);
  };
  classRepository.renameSubject = async (oldName, newName, options) => {
    calls.push(["class", oldName, newName, options.session.id]);
  };

  try {
    const result = await subjectService.updateSubject("507f1f77bcf86cd799439011", {
      name: "Toán học",
    });
    assert.equal(result.name, "Toán học");
    assert.deepEqual(calls.sort(), [
      ["class", "Toán", "Toán học", "subject-session"],
      ["tutor", "Toán", "Toán học", "subject-session"],
    ]);
  } finally {
    mongoose.startSession = originals.startSession;
    subjectRepository.findById = originals.findById;
    subjectRepository.existsByName = originals.existsByName;
    subjectRepository.updateById = originals.updateById;
    tutorRepository.renameSubject = originals.renameTutorSubject;
    classRepository.renameSubject = originals.renameClassSubject;
  }
});
