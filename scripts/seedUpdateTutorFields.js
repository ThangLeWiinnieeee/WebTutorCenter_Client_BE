require("dotenv").config();
const mongoose = require("mongoose");
const Tutor = require("../src/models/tutor.model");
const { assertSeedAllowed } = require("./_seedSafety");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ MongoDB connected");
  } catch (error) {
    console.error("✗ MongoDB connection failed:", error);
    process.exit(1);
  }
};

const updateTutorFields = async () => {
  try {
    console.log("🔄 Bắt đầu cập nhật fields cho tutor...");

    const [totalResult, monthlyResult] = await Promise.all([
      Tutor.updateMany(
        { totalClassesAccepted: { $exists: false } },
        { $set: { totalClassesAccepted: 0 } },
      ),
      Tutor.updateMany(
        { classesAcceptedThisMonth: { $exists: false } },
        { $set: { classesAcceptedThisMonth: 0 } },
      ),
    ]);

    console.log(
      `✓ Backfill totalClassesAccepted: ${totalResult.modifiedCount}, classesAcceptedThisMonth: ${monthlyResult.modifiedCount}`,
    );
  } catch (error) {
    console.error("✗ Lỗi khi cập nhật:", error);
  } finally {
    await mongoose.connection.close();
    console.log("✓ MongoDB disconnected");
  }
};

const main = async () => {
  assertSeedAllowed("seedUpdateTutorFields");
  await connectDB();
  await updateTutorFields();
};

main();
