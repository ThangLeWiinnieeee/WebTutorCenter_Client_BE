const ClassView = require("../models/class.view.model");

// Ghi nhận gia sư xem một lớp; trả về true NẾU đây là lần xem ĐẦU TIÊN (bản ghi vừa được tạo),
// false nếu đã xem trước đó. Upsert + unique index → kiểm tra "lần đầu" là nguyên tử, không lo race.
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
