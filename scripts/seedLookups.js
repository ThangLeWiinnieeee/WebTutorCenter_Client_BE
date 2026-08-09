require("dotenv").config();
const mongoose = require("mongoose");
const Lookup = require("../src/models/lookup.model");
const { assertSeedAllowed } = require("./_seedSafety");

const seedLookups = async () => {
  try {
    assertSeedAllowed("seedLookups");
    console.log("🌱 Seeding lookup data...");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/webtutorcenter", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✓ Connected to MongoDB");

    // Lookup data
    const lookups = [
      // SUBJECTS
      { type: "subject", value: "Toán", label: "Toán", order: 1 },
      { type: "subject", value: "Tiếng Anh", label: "Tiếng Anh", order: 2 },
      { type: "subject", value: "Vật Lý", label: "Vật Lý", order: 3 },
      { type: "subject", value: "Hóa Học", label: "Hóa Học", order: 4 },
      { type: "subject", value: "Sinh Học", label: "Sinh Học", order: 5 },
      { type: "subject", value: "Lịch Sử", label: "Lịch Sử", order: 6 },
      { type: "subject", value: "Địa Lý", label: "Địa Lý", order: 7 },
      { type: "subject", value: "Tiếng Việt", label: "Tiếng Việt", order: 8 },
      { type: "subject", value: "Piano", label: "Piano", order: 9 },
      { type: "subject", value: "Điêu Khắc", label: "Điêu Khắc", order: 10 },

      // OCCUPATION_STATUS
      { type: "occupation_status", value: "Giáo viên", label: "Giáo viên", order: 1 },
      { type: "occupation_status", value: "Sinh viên", label: "Sinh viên", order: 2 },
      { type: "occupation_status", value: "Nghề khác", label: "Nghề khác", order: 3 },

      // GENDERS
      { type: "gender", value: "Nam", label: "Nam", order: 1 },
      { type: "gender", value: "Nữ", label: "Nữ", order: 2 },

      // PROVINCES
      { type: "province", value: "Hà Nội", label: "Hà Nội", order: 1 },
      { type: "province", value: "TP Hồ Chí Minh", label: "TP Hồ Chí Minh", order: 2 },
      { type: "province", value: "Đà Nẵng", label: "Đà Nẵng", order: 3 },
      { type: "province", value: "Hải Phòng", label: "Hải Phòng", order: 4 },
      { type: "province", value: "Cần Thơ", label: "Cần Thơ", order: 5 },

      // DISTRICTS - Hà Nội
      { type: "district", value: "Hoàn Kiếm", label: "Hoàn Kiếm", parentId: "Hà Nội", order: 1 },
      { type: "district", value: "Ba Đình", label: "Ba Đình", parentId: "Hà Nội", order: 2 },
      { type: "district", value: "Đống Đa", label: "Đống Đa", parentId: "Hà Nội", order: 3 },
      { type: "district", value: "Thanh Xuân", label: "Thanh Xuân", parentId: "Hà Nội", order: 4 },
      { type: "district", value: "Cầu Giấy", label: "Cầu Giấy", parentId: "Hà Nội", order: 5 },
      { type: "district", value: "Tây Hồ", label: "Tây Hồ", parentId: "Hà Nội", order: 6 },

      // DISTRICTS - TP Hồ Chí Minh
      { type: "district", value: "Quận 1", label: "Quận 1", parentId: "TP Hồ Chí Minh", order: 1 },
      { type: "district", value: "Quận 2", label: "Quận 2", parentId: "TP Hồ Chí Minh", order: 2 },
      { type: "district", value: "Quận 3", label: "Quận 3", parentId: "TP Hồ Chí Minh", order: 3 },
      { type: "district", value: "Quận 4", label: "Quận 4", parentId: "TP Hồ Chí Minh", order: 4 },
      { type: "district", value: "Quận 5", label: "Quận 5", parentId: "TP Hồ Chí Minh", order: 5 },

      // DISTRICTS - Đà Nẵng
      { type: "district", value: "Hải Châu", label: "Hải Châu", parentId: "Đà Nẵng", order: 1 },
      { type: "district", value: "Thanh Khê", label: "Thanh Khê", parentId: "Đà Nẵng", order: 2 },
      { type: "district", value: "Sơn Trà", label: "Sơn Trà", parentId: "Đà Nẵng", order: 3 },

      // DISTRICTS - Hải Phòng
      { type: "district", value: "Hồng Bàng", label: "Hồng Bàng", parentId: "Hải Phòng", order: 1 },
      { type: "district", value: "Ngô Quyền", label: "Ngô Quyền", parentId: "Hải Phòng", order: 2 },

      // DISTRICTS - Cần Thơ
      { type: "district", value: "Ninh Kiều", label: "Ninh Kiều", parentId: "Cần Thơ", order: 1 },
      { type: "district", value: "Bình Thủy", label: "Bình Thủy", parentId: "Cần Thơ", order: 2 },
    ];

    const result = await Lookup.bulkWrite(
      lookups.map((lookup) => ({
        updateOne: {
          filter: { type: lookup.type, value: lookup.value },
          update: { $setOnInsert: { ...lookup, isActive: true } },
          upsert: true,
        },
      })),
    );
    console.log(`✓ Created ${result.upsertedCount} missing lookups; preserved existing data`);

    await mongoose.disconnect();
    console.log("✅ Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
};

seedLookups();
