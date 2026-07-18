const ClassView = require("../models/class.view.model");

// Ghi nhận gia sư xem một lớp; trả về true nếu là lần xem đầu tiên
const recordFirstView = async (userId, classId) => {
  const res = await ClassView.updateOne(
    { userId, classId },
    { $setOnInsert: { userId, classId, createdAt: new Date() } },
    { upsert: true }
  );
  return res.upsertedCount === 1;
};

module.exports = {
  recordFirstView,
};
