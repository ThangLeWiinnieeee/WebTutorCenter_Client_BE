/**
 * Seed dữ liệu demo TOÀN DIỆN cho WebTutorCenter.
 *
 * Bao phủ "tất cả các trường hợp" của website:
 *   - 100 người dùng (admin / phụ huynh-học viên / gia sư) đầy đủ thông tin + ảnh đại diện thật
 *   - Hồ sơ gia sư ở mọi trạng thái: approved / pending / rejected
 *   - Mã giảm giá (promo) ở mọi trạng thái: active / scheduled / expired / inactive /
 *     hết lượt / đã xóa mềm (thùng rác) + voucher cá nhân trong "kho mã"
 *   - Bài đăng tìm gia sư (class) ở mọi vòng đời: open / matched / expired / completed / đã xóa mềm
 *     (có cả bài áp mã ưu đãi)
 *   - Đơn ứng tuyển nhận lớp (class application) ở mọi trạng thái:
 *     pending / approved / rejected / cancel_requested / cancelled
 *   - Thông báo (notification) đủ mọi loại, trộn đã đọc / chưa đọc
 *   - Yêu cầu đổi hồ sơ gia sư (profile change request): pending / approved / rejected
 *
 * Script IDEMPOTENT: upsert theo khóa tự nhiên (email / code / classCode / cặp class-tutor),
 * chạy lại nhiều lần không nhân đôi dữ liệu.
 *
 * Chạy:
 *   node scripts/seedFullDemo.js
 *   (hoặc: npm run seed:full)
 *
 * Yêu cầu trước khi chạy:
 *   - File .env có MONGODB_URI
 *   - ALLOW_DESTRUCTIVE_SEED=true và NODE_ENV khác production
 *   - Đã seed locations:  npm run seed:locations   (cần province/district)
 *   - (Tùy chọn) seed pricing: npm run seed:pricing — nếu thiếu, script tự tạo config mặc định.
 */

require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../src/models/user.model");
const Tutor = require("../src/models/tutor.model");
const Class = require("../src/models/class.model");
const { CLASS_STATUS } = require("../src/constants/class");
const { ClassApplication } = require("../src/models/class.application.model");
const { CLASS_APPLICATION_STATUS } = require("../src/constants/classApplication");
const Promo = require("../src/models/promo.model");
const { Notification } = require("../src/models/notification.model");
const { NOTIFICATION_TYPES } = require("../src/constants/notification");
const ProfileChangeRequest = require("../src/models/profileChangeRequest.model");
const { PROFILE_CHANGE_STATUS } = require("../src/constants/profileChangeRequest");
const Review = require("../src/models/review.model");
const { Conversation } = require("../src/models/conversation.model");
const { CHAT_ROLES } = require("../src/constants/chat");
const { Message } = require("../src/models/message.model");
const { Payment } = require("../src/models/payment.model");
const ClassView = require("../src/models/class.view.model");

const locationRepository = require("../src/repositories/location.repository");
const classPricingRepository = require("../src/repositories/class.pricing.repository");
const { hashPassword } = require("../src/utils/hash");

const ROLES = require("../src/constants/role");
const ACCOUNT_TYPE = require("../src/constants/accountType");
const OCCUPATION_STATUS = require("../src/constants/occupationStatus");
const { TUTOR_STATUS, GENDER_OPTIONS, DAYS_OF_WEEK } = require("../src/constants/tutor");
const SUBJECTS = require("./subjectsSeedData");
const { assertSeedAllowed } = require("./_seedSafety");

const DEFAULT_PASSWORD = "Password123";
const DEMO_CLASS_CODE_START = 90000;
const DEMO_CLASS_COUNT = 40;

// Pricing config mặc định (đồng bộ với scripts/seedClassPricing.js) — dùng để self-heal nếu thiếu.
const DEFAULT_PRICING = {
  defaultBaseFee: 150000,
  studentCountSurcharge: 15000,
  sessionLengthBaseMinutes: 90,
  minutesPerSessionOptions: [60, 90, 120, 150, 180],
  sessionsPerWeekMin: 1,
  sessionsPerWeekMax: 7,
  baseFeeBySubject: [
    { subject: "Toán", fee: 150000 },
    { subject: "Ngữ văn", fee: 140000 },
    { subject: "Tiếng Anh", fee: 170000 },
    { subject: "Vật lý", fee: 160000 },
    { subject: "Hóa học", fee: 160000 },
    { subject: "Sinh học", fee: 150000 },
    { subject: "Lịch sử", fee: 130000 },
    { subject: "Địa lý", fee: 130000 },
    { subject: "Tin học", fee: 180000 },
  ],
};

// ──────────────────────────── Tiện ích deterministic ────────────────────────────

// PRNG có hạt giống cố định → mỗi lần chạy sinh cùng dữ liệu (ổn định, dễ debug).
let _seed = 0x9e3779b9;
const rnd = () => {
  _seed |= 0;
  _seed = (_seed + 0x6d2b79f5) | 0;
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const randInt = (min, max) => min + Math.floor(rnd() * (max - min + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const pickSome = (arr, n) => {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  return out;
};

const removeTones = (str) =>
  str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// SĐT hợp lệ theo PHONE_REGEX /^(84|0)(3|5|7|8|9)[0-9]{8}$/
const makePhone = (seq) => `09${String(seq % 100000000).padStart(8, "0")}`;

// Ảnh giấy tờ minh chứng (CCCD / thẻ SV / bằng cấp) — placeholder hiển thị được để
// admin đối chiếu khi duyệt hồ sơ. Các field này nay BẮT BUỘC trong tutor.model.
const docImage = (label) =>
  `https://placehold.co/800x500/e2e8f0/1e3a5f?text=${encodeURIComponent(label)}`;

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

// ──────────────────────────── Vốn từ tiếng Việt để sinh tên ────────────────────────────

const FAMILY = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng",
  "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đinh", "Mai", "Tạ", "Cao"];
const MALE_GIVEN = ["Anh Tuấn", "Minh Quân", "Gia Huy", "Hải Đăng", "Đức Long", "Quốc Bảo",
  "Tuấn Kiệt", "Thanh Tùng", "Bá Lộc", "Hữu Phước", "Minh Khang", "Nhật Minh", "Đức Anh",
  "Tuấn Phong", "Quốc Việt", "Hoàng Nam", "Trọng Nghĩa", "Văn Hùng", "Đăng Khoa", "Chí Bảo"];
const FEMALE_GIVEN = ["Thu Hà", "Phương Thảo", "Ngọc Linh", "Khánh Vy", "Hà My", "Bảo Châu",
  "Mai Chi", "Bích Ngân", "Thanh Trúc", "Diễm Quỳnh", "Ngọc Hân", "Hương Giang", "Tuyết Mai",
  "Minh Anh", "Phương Uyên", "Thảo Vy", "Quỳnh Như", "Kim Ngân", "Hoài An", "Lan Anh"];

const SCHOOLS = [
  "Đại học Sư phạm Hà Nội", "Đại học Bách khoa Hà Nội", "Đại học Ngoại ngữ - ĐHQGHN",
  "Đại học Khoa học Tự nhiên - ĐHQGHN", "Đại học Kinh tế Quốc dân", "Đại học Ngoại thương",
  "Đại học Y Dược TP.HCM", "Đại học Bách khoa TP.HCM", "Đại học Sư phạm TP.HCM",
  "Đại học Khoa học Xã hội và Nhân văn", "Đại học Công nghệ - ĐHQGHN", "Đại học Hà Nội",
];

const BIOS = [
  "Gia sư nhiệt tình, kiên nhẫn, có kinh nghiệm kèm học sinh mất gốc lấy lại nền tảng vững chắc.",
  "Phương pháp dạy bám sát chương trình, hệ thống kiến thức bằng sơ đồ tư duy, luyện đề định kỳ.",
  "Tốt nghiệp loại giỏi, từng ôn luyện cho nhiều học sinh đạt điểm cao trong các kỳ thi quan trọng.",
  "Tập trung xây nền tảng, giải bài tập theo từng bước và rèn cho học sinh thói quen tự học hiệu quả.",
  "Có kinh nghiệm dạy kèm 1-1 và nhóm nhỏ, theo sát tiến độ và phản hồi thường xuyên với phụ huynh.",
  "Yêu thích việc giảng dạy, luôn tạo không khí học thoải mái để học sinh tự tin đặt câu hỏi.",
];

const CLASS_TOPICS = ["Củng cố kiến thức nền", "Luyện đề và chữa bài", "Ôn tập học kỳ",
  "Nâng cao kỹ năng làm bài", "Học bám sát chương trình", "Lấy lại gốc cơ bản"];

// ──────────────────────────── Logic tính học phí (sao chép từ class.service) ────────────────────────────

const mapBaseFee = (list = []) => {
  const m = {};
  for (const it of list) if (it?.subject) m[it.subject] = it.fee;
  return m;
};

const calcFee = (payload, cfg) => {
  const feeMap = mapBaseFee(cfg.baseFeeBySubject);
  const baseFee = feeMap[payload.subject] ?? cfg.defaultBaseFee;
  const durationFactor = payload.minutesPerSession / cfg.sessionLengthBaseMinutes;
  const studentSurcharge = Math.max(0, payload.studentCount - 1) * cfg.studentCountSurcharge;
  const feePerSession = Math.round(baseFee * durationFactor + studentSurcharge);
  const feePerMonth = feePerSession * payload.sessionsPerWeek * 4;
  return { feePerSession, feePerMonth };
};

const computeDiscount = (promo, amount) => {
  let discount = 0;
  if (promo.discountType === "percent") {
    discount = (amount * promo.discountValue) / 100;
    if (promo.maxDiscountAmount != null) discount = Math.min(discount, promo.maxDiscountAmount);
  } else {
    discount = promo.discountValue;
  }
  discount = Math.min(discount, amount);
  return Math.max(0, Math.round(discount));
};

// ──────────────────────────── Kết nối & chuẩn bị ────────────────────────────

const connect = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("Thiếu MONGODB_URI (hoặc MONGO_URI) trong file .env");
  console.log("→ Đang kết nối MongoDB...");
  await mongoose.connect(uri);
  console.log("✓ Đã kết nối.");
};

// Chỉ dọn dữ liệu phụ thuộc của các tài khoản @webtutor.dev do chính script quản lý.
const resetDemoData = async (demoUserIds) => {
  const demoClassCodes = Array.from(
    { length: DEMO_CLASS_COUNT },
    (_, index) => String(DEMO_CLASS_CODE_START + index),
  );
  const conflictingClass = await Class.findOne({
    classCode: { $in: demoClassCodes },
    createdBy: { $nin: demoUserIds },
  }, { classCode: 1 }).lean();
  if (conflictingClass) {
    throw new Error(
      `Mã lớp demo ${conflictingClass.classCode} đang thuộc dữ liệu ngoài demo; dừng seed để không ghi đè.`,
    );
  }

  const [classes, conversations] = await Promise.all([
    Class.find({ createdBy: { $in: demoUserIds } }, { _id: 1 }).lean(),
    Conversation.find({ tutorUserId: { $in: demoUserIds } }, { _id: 1 }).lean(),
  ]);
  const classIds = classes.map((item) => item._id);
  const conversationIds = conversations.map((item) => item._id);

  const [removedApps, removedReviews] = await Promise.all([
    ClassApplication.deleteMany({ classId: { $in: classIds } }),
    Review.deleteMany({ classId: { $in: classIds } }),
    Payment.deleteMany({ classId: { $in: classIds } }),
    ClassView.deleteMany({ classId: { $in: classIds } }),
    Message.deleteMany({ conversationId: { $in: conversationIds } }),
  ]);
  const [removedClasses, removedConversations] = await Promise.all([
    Class.deleteMany({ _id: { $in: classIds } }),
    Conversation.deleteMany({ _id: { $in: conversationIds } }),
  ]);

  console.log(
    `→ Reset demo: ${removedClasses.deletedCount} lớp, ${removedApps.deletedCount} đơn, ${removedReviews.deletedCount} đánh giá, ${removedConversations.deletedCount} hội thoại.`,
  );
};

const loadAreas = async () => {
  const provinces = await locationRepository.findAllProvinces();
  if (!provinces.length) {
    throw new Error("Chưa có dữ liệu tỉnh/thành. Hãy chạy: npm run seed:locations trước.");
  }
  const samples = [];
  for (const province of provinces) {
    const districts = await locationRepository.findDistrictsByProvinceCode(province.code);
    if (districts.length >= 1) samples.push({ province, districts });
    if (samples.length >= 15) break;
  }
  if (!samples.length) throw new Error("Dữ liệu tỉnh/quận chưa đủ để seed.");
  return samples;
};

const ensurePricing = async () => {
  let cfg = await classPricingRepository.findDefault();
  if (!cfg) {
    console.log("• Chưa có pricing config → tạo mặc định.");
    cfg = await classPricingRepository.upsertDefault(DEFAULT_PRICING);
  }
  return cfg;
};

// ──────────────────────────── 1) Người dùng (100) ────────────────────────────

// Phân bổ chỉ số:
//   0-2    : admin (3)
//   3-47   : phụ huynh / học viên (45)  — kèm các trường hợp đặc biệt
//   48-77  : gia sư APPROVED (30) — role tutor
//   78-89  : gia sư PENDING (12)  — role user (chờ duyệt)
//   90-96  : gia sư REJECTED (7)  — role user (bị từ chối)
//   97-99  : user đặc biệt (3): tài khoản Google, vô hiệu hóa, chưa xác thực
const buildUserSeeds = () => {
  const seeds = [];
  for (let i = 0; i < 100; i += 1) {
    const gender = pick(GENDER_OPTIONS);
    const family = FAMILY[i % FAMILY.length];
    const given = gender === "female" ? pick(FEMALE_GIVEN) : pick(MALE_GIVEN);
    const fullName = `${family} ${given}`;
    const portraitN = i % 100;
    const avatar =
      gender === "female"
        ? `https://randomuser.me/api/portraits/women/${portraitN}.jpg`
        : `https://randomuser.me/api/portraits/men/${portraitN}.jpg`;

    let role = ROLES.USER;
    if (i <= 2) role = ROLES.ADMIN;
    else if (i >= 48 && i <= 77) role = ROLES.TUTOR; // chỉ tutor đã duyệt mới lên role tutor

    const seed = {
      idx: i,
      fullName,
      email: `${removeTones(family)}.${removeTones(given)}${String(i).padStart(2, "0")}@webtutor.dev`,
      role,
      gender,
      phone: makePhone(901000000 + i),
      dateOfBirth: new Date(`${1990 + (i % 18)}-${String(1 + (i % 12)).padStart(2, "0")}-${String(1 + (i % 27)).padStart(2, "0")}`),
      avatar,
      type: ACCOUNT_TYPE.LOCAL,
      isActive: true,
      isVerified: true,
      phoneActivated: true,
    };

    // Trường hợp đặc biệt trong nhóm user thường
    if (i === 10) seed.isActive = false; // tài khoản bị vô hiệu hóa
    if (i === 11) { seed.isVerified = false; seed.phoneActivated = false; } // chưa xác thực email
    if (i === 12) seed.phoneActivated = false; // chưa kích hoạt SĐT
    if (i === 13) { seed.type = ACCOUNT_TYPE.GOOGLE; seed.noPassword = true; } // đăng nhập Google
    if (i === 14) { seed.isActive = false; seed.softDeleted = true; } // bị admin xóa mềm

    // Nhóm user đặc biệt cuối
    if (i === 97) { seed.type = ACCOUNT_TYPE.GOOGLE; seed.noPassword = true; seed.avatar = `https://randomuser.me/api/portraits/women/${(i % 100)}.jpg`; }
    if (i === 98) seed.isActive = false;
    if (i === 99) { seed.isVerified = false; seed.phoneActivated = false; }

    seeds.push(seed);
  }
  // Cho tên admin đầu tiên dễ nhận biết
  seeds[0].fullName = "Quản trị viên Demo";
  seeds[0].email = "admin@webtutor.dev";
  return seeds;
};

const seedUsers = async (userSeeds, hashed) => {
  console.log(`→ Seeding ${userSeeds.length} người dùng...`);
  const byIdx = {};
  // admin đầu tiên dùng làm deletedBy cho bản ghi xóa mềm
  let firstAdminId = null;

  for (const s of userSeeds) {
    const payload = {
      fullName: s.fullName,
      email: s.email,
      password: s.noPassword ? null : hashed,
      role: s.role,
      type: s.type,
      phone: s.phone,
      gender: s.gender,
      dateOfBirth: s.dateOfBirth,
      avatar: s.avatar,
      isActive: s.isActive,
      isVerified: s.isVerified,
      phoneActivated: s.phoneActivated,
      refreshToken: null,
      deletedAt: null,
      deletedBy: null,
    };
    const user = await User.findOneAndUpdate(
      { email: s.email },
      { $set: payload },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    byIdx[s.idx] = user;
    if (s.idx === 0) firstAdminId = user._id;
  }

  // Áp xóa mềm sau khi đã có admin id
  for (const s of userSeeds) {
    if (s.softDeleted) {
      await User.updateOne(
        { _id: byIdx[s.idx]._id },
        { $set: { deletedAt: daysAgo(5), deletedBy: firstAdminId } },
      );
    }
  }

  console.log(`✓ Đã seed người dùng. Mật khẩu mặc định: ${DEFAULT_PASSWORD}`);
  return byIdx;
};

// ──────────────────────────── 2) Hồ sơ gia sư ────────────────────────────

const buildAvailability = () => {
  const used = new Set();
  const count = randInt(2, 4);
  const slots = [];
  let guard = 0;
  while (slots.length < count && guard < 50) {
    guard += 1;
    const day = pick(DAYS_OF_WEEK);
    const hour = randInt(17, 21);
    const key = `${day}-${hour}`;
    if (used.has(key)) continue;
    used.add(key);
    slots.push({ day, hour });
  }
  return slots;
};

const seedTutors = async (usersByIdx, areas) => {
  console.log("→ Seeding hồ sơ gia sư (approved / pending / rejected)...");
  const tutorByUserIdx = {};

  const makeTutor = async (idx, status) => {
    const user = usersByIdx[idx];
    const area = areas[idx % areas.length];
    const districts = pickSome(area.districts, Math.min(3, area.districts.length)).map((d) => d.code);
    const occ = pick(Object.values(OCCUPATION_STATUS));
    const subjects = pickSome(SUBJECTS, randInt(1, 2));
    const isStudent = occ === OCCUPATION_STATUS.STUDENT;

    const base = {
      userId: user._id,
      phone: user.phone,
      subjects,
      occupationStatus: occ,
      teachingAreas: { province: area.province.code, districts },
      currentArea: { province: area.province.code, district: districts[0] },
      schoolName: pick(SCHOOLS),
      graduationYear: isStudent ? null : randInt(2010, 2024),
      bio: pick(BIOS),
      // Giấy tờ minh chứng: CCCD luôn bắt buộc; thẻ SV (sinh viên) / bằng cấp (đã tốt
      // nghiệp - giáo viên) theo đúng quy tắc đăng ký hồ sơ.
      cccdFrontImage: docImage("CCCD mặt trước"),
      cccdBackImage: docImage("CCCD mặt sau"),
      studentCardFrontImage: isStudent ? docImage("Thẻ SV mặt trước") : null,
      studentCardBackImage: isStudent ? docImage("Thẻ SV mặt sau") : null,
      certificateImages: isStudent ? [] : [docImage("Bằng cấp")],
      status,
      rejectionReason: status === TUTOR_STATUS.REJECTED
        ? "Hồ sơ chưa cung cấp đủ minh chứng bằng cấp/kinh nghiệm. Vui lòng bổ sung và đăng ký lại."
        : null,
      availability: buildAvailability(),
      totalClassesAccepted: status === TUTOR_STATUS.APPROVED ? randInt(0, 25) : 0,
      classesAcceptedThisMonth: status === TUTOR_STATUS.APPROVED ? randInt(0, 5) : 0,
    };

    const tutor = await Tutor.findOneAndUpdate(
      { userId: user._id },
      { $set: base },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    tutorByUserIdx[idx] = tutor;
    return tutor;
  };

  for (let i = 48; i <= 77; i += 1) await makeTutor(i, TUTOR_STATUS.APPROVED);
  for (let i = 78; i <= 89; i += 1) await makeTutor(i, TUTOR_STATUS.PENDING);
  for (let i = 90; i <= 96; i += 1) await makeTutor(i, TUTOR_STATUS.REJECTED);

  console.log("✓ Đã seed hồ sơ gia sư (30 approved, 12 pending, 7 rejected).");
  return tutorByUserIdx;
};

// ──────────────────────────── 3) Mã giảm giá (promo) ────────────────────────────

const seedPromos = async (usersByIdx, adminId) => {
  console.log("→ Seeding mã giảm giá (mọi trạng thái)...");

  const globalPromos = [
    {
      code: "DEMO_WELCOME10", description: "Giảm 10% học phí tháng đầu (tối đa 100k)",
      discountType: "percent", discountValue: 10, maxDiscountAmount: 100000,
      isActive: true, startsAt: daysAgo(30), expiresAt: daysFromNow(60),
      usageLimit: 1000, usedCount: 42,
    },
    {
      code: "DEMO_GIAM50K", description: "Giảm thẳng 50.000đ học phí tháng",
      discountType: "fixed", discountValue: 50000, maxDiscountAmount: null,
      isActive: true, startsAt: daysAgo(10), expiresAt: daysFromNow(90),
      usageLimit: null, usedCount: 7,
    },
    {
      code: "DEMO_SALE20", description: "Giảm 20% không giới hạn trần (sự kiện)",
      discountType: "percent", discountValue: 20, maxDiscountAmount: null,
      isActive: true, startsAt: daysAgo(2), expiresAt: daysFromNow(15),
      usageLimit: 200, usedCount: 5,
    },
    {
      code: "DEMO_SCHEDULED5", description: "Mã sắp có hiệu lực (chưa tới ngày bắt đầu)",
      discountType: "percent", discountValue: 5, maxDiscountAmount: 80000,
      isActive: true, startsAt: daysFromNow(7), expiresAt: daysFromNow(37),
      usageLimit: 100, usedCount: 0,
    },
    {
      code: "DEMO_EXPIRED15", description: "Mã đã hết hạn",
      discountType: "percent", discountValue: 15, maxDiscountAmount: 120000,
      isActive: true, startsAt: daysAgo(90), expiresAt: daysAgo(10),
      usageLimit: 500, usedCount: 230,
    },
    {
      code: "DEMO_INACTIVE30", description: "Mã đã bị ngừng áp dụng",
      discountType: "percent", discountValue: 30, maxDiscountAmount: 150000,
      isActive: false, startsAt: daysAgo(20), expiresAt: daysFromNow(20),
      usageLimit: 100, usedCount: 12,
    },
    {
      code: "DEMO_SOLDOUT", description: "Mã đã hết lượt sử dụng",
      discountType: "fixed", discountValue: 30000, maxDiscountAmount: null,
      isActive: true, startsAt: daysAgo(15), expiresAt: daysFromNow(15),
      usageLimit: 50, usedCount: 50,
    },
    {
      code: "DEMO_TRASHED25", description: "Mã đã bị xóa mềm (nằm trong thùng rác)",
      discountType: "percent", discountValue: 25, maxDiscountAmount: 100000,
      isActive: true, startsAt: daysAgo(5), expiresAt: daysFromNow(30),
      usageLimit: 100, usedCount: 3, deletedAt: daysAgo(3),
    },
  ];

  const promoByCode = {};
  for (const p of globalPromos) {
    const data = { ...p, ownerUserId: null };
    if (p.deletedAt) data.deletedBy = adminId;
    const doc = await Promo.findOneAndUpdate(
      { code: p.code },
      { $set: data },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    promoByCode[p.code] = doc;
  }

  // Voucher cá nhân trong "kho mã" của một số user (quà hoàn thành lớp)
  const personalVouchers = [
    { idx: 3, code: "DEMO_RWPARENT1", status: "active", usedCount: 0, isActive: true, expiresAt: daysFromNow(45) },
    { idx: 3, code: "DEMO_RWPARENT2", status: "used", usedCount: 1, isActive: true, expiresAt: daysFromNow(45) },
    { idx: 4, code: "DEMO_RWPARENT3", status: "expired", usedCount: 0, isActive: true, expiresAt: daysAgo(2) },
    { idx: 48, code: "DEMO_RWTUTOR1", status: "active", usedCount: 0, isActive: true, expiresAt: daysFromNow(50) },
    { idx: 49, code: "DEMO_RWTUTOR2", status: "used", usedCount: 1, isActive: true, expiresAt: daysFromNow(50) },
  ];
  for (const v of personalVouchers) {
    await Promo.findOneAndUpdate(
      { code: v.code },
      {
        $set: {
          code: v.code,
          ownerUserId: usersByIdx[v.idx]._id,
          description: "Quà hoàn thành lớp học",
          discountType: "percent",
          discountValue: 10,
          maxDiscountAmount: 200000,
          isActive: v.isActive,
          usageLimit: 1,
          usedCount: v.usedCount,
          startsAt: null,
          expiresAt: v.expiresAt,
          deletedAt: null,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  console.log(`✓ Đã seed ${globalPromos.length} mã toàn cục + ${personalVouchers.length} voucher cá nhân.`);
  return promoByCode;
};

// ──────────────────────────── 4) Bài đăng tìm gia sư (class) ────────────────────────────

// Trả về danh sách class đã tạo kèm metadata để bước ứng tuyển dùng lại.
const seedClasses = async (usersByIdx, areas, cfg, promoByCode, approvedTutorIdxs) => {
  console.log("→ Seeding bài đăng tìm gia sư (class) — mọi vòng đời...");

  const minutesOptions = cfg.minutesPerSessionOptions;
  const parentIdxs = []; // phụ huynh/học viên đăng bài
  for (let i = 3; i <= 47; i += 1) if (usersByIdx[i].isActive) parentIdxs.push(i);

  const created = [];
  let codeSeq = DEMO_CLASS_CODE_START;

  const makeClass = async ({ idx, status, posterIdx, subject, startDate, promoCode, completed }) => {
    const area = areas[idx % areas.length];
    const district = pick(area.districts);
    const poster = usersByIdx[posterIdx];
    const studentCount = randInt(1, 4);
    const minutesPerSession = pick(minutesOptions);
    const sessionsPerWeek = randInt(1, 4);
    const subj = subject || pick(SUBJECTS);

    const { feePerSession, feePerMonth } = calcFee(
      { subject: subj, minutesPerSession, studentCount, sessionsPerWeek },
      cfg,
    );

    let finalFeePerMonth = feePerMonth;
    let promoDiscount = 0;
    let appliedPromoCode = null;
    if (promoCode && promoByCode[promoCode]) {
      promoDiscount = computeDiscount(promoByCode[promoCode], feePerMonth);
      finalFeePerMonth = Math.max(0, feePerMonth - promoDiscount);
      appliedPromoCode = promoByCode[promoCode].code;
    }

    const classCode = String(codeSeq++);
    const data = {
      classCode,
      createdBy: poster._id,
      contactPhone: poster.phone,
      // Không lặp tên môn ở đây: tiêu đề thẻ đã hiển thị "{môn} - {summary}".
      summary: pick(CLASS_TOPICS),
      description: `Cần tìm gia sư môn ${subj} hỗ trợ học viên theo mục tiêu cụ thể. Ưu tiên gia sư có phương pháp rõ ràng, theo sát tiến độ, chữa bài định kỳ và phản hồi thường xuyên với phụ huynh.`,
      subject: subj,
      studentGender: pick(GENDER_OPTIONS),
      studentCount,
      startDate,
      minutesPerSession,
      sessionsPerWeek,
      provinceCode: area.province.code,
      provinceName: area.province.name,
      districtCode: district.code,
      districtName: district.name,
      locationLabel: `${district.name}, ${area.province.name}`,
      availabilitySlots: buildAvailability(),
      tutorGenderPref: pick([...GENDER_OPTIONS, "any"]),
      tutorLevelPref: pick(["student", "teacher", "any"]),
      promoCode: appliedPromoCode,
      promoDiscount,
      feePerSession,
      feePerMonth,
      finalFeePerMonth,
      status,
      completedByPoster: completed || false,
      completedByTutor: completed || false,
      completedAt: completed ? daysAgo(randInt(1, 10)) : null,
      deletedAt: null,
      deletedBy: null,
    };

    const doc = await Class.findOneAndUpdate(
      { classCode },
      { $set: data },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    created.push({ doc, status, posterIdx, subject: subj });
    return doc;
  };

  let n = 0;
  // 20 OPEN — vài bài áp mã ưu đãi
  for (let k = 0; k < 20; k += 1) {
    await makeClass({
      idx: n, status: CLASS_STATUS.OPEN, posterIdx: parentIdxs[n % parentIdxs.length],
      startDate: daysFromNow(randInt(3, 30)),
      promoCode: k % 5 === 0 ? "DEMO_WELCOME10" : k % 7 === 0 ? "DEMO_GIAM50K" : null,
    });
    n += 1;
  }
  // 8 MATCHED — subject = môn của tutor sẽ được gán (để hợp lý nghiệp vụ)
  const matched = [];
  for (let k = 0; k < 8; k += 1) {
    const tutorIdx = approvedTutorIdxs[k % approvedTutorIdxs.length];
    const tutor = tutorByUserIdxGlobal[tutorIdx];
    const subject = tutor.subjects[0];
    const doc = await makeClass({
      idx: n, status: CLASS_STATUS.MATCHED, posterIdx: parentIdxs[n % parentIdxs.length],
      subject, startDate: daysFromNow(randInt(1, 14)),
    });
    matched.push({ classDoc: doc, tutorIdx });
    n += 1;
  }
  // 5 EXPIRED — đã qua ngày bắt đầu, chưa ai nhận
  for (let k = 0; k < 5; k += 1) {
    await makeClass({
      idx: n, status: CLASS_STATUS.EXPIRED, posterIdx: parentIdxs[n % parentIdxs.length],
      startDate: daysAgo(randInt(2, 20)),
    });
    n += 1;
  }
  // 5 COMPLETED — đã hoàn thành (cả hai xác nhận)
  const completedList = [];
  for (let k = 0; k < 5; k += 1) {
    const tutorIdx = approvedTutorIdxs[(k + 8) % approvedTutorIdxs.length];
    const tutor = tutorByUserIdxGlobal[tutorIdx];
    const subject = tutor.subjects[0];
    const doc = await makeClass({
      idx: n, status: CLASS_STATUS.COMPLETED, posterIdx: parentIdxs[n % parentIdxs.length],
      subject, startDate: daysAgo(randInt(20, 60)), completed: true,
    });
    completedList.push({ classDoc: doc, tutorIdx });
    n += 1;
  }
  // 2 SOFT-DELETED — bài trong thùng rác
  for (let k = 0; k < 2; k += 1) {
    const doc = await makeClass({
      idx: n, status: CLASS_STATUS.OPEN, posterIdx: parentIdxs[n % parentIdxs.length],
      startDate: daysFromNow(randInt(3, 15)),
    });
    await Class.updateOne({ _id: doc._id }, { $set: { deletedAt: daysAgo(2), deletedBy: usersByIdx[0]._id } });
    n += 1;
  }

  console.log(`✓ Đã seed ${created.length} bài đăng (20 open, 8 matched, 5 expired, 5 completed, 2 đã xóa mềm).`);
  return { allClasses: created, matched, completedList, openClasses: created.filter((c) => c.status === CLASS_STATUS.OPEN) };
};

// Tham chiếu toàn cục cho seedClasses (gán trong main sau khi có tutor map)
let tutorByUserIdxGlobal = {};

// ──────────────────────────── 5) Đơn ứng tuyển nhận lớp ────────────────────────────

const upsertApplication = async (classId, tutorId, status, extra = {}) => {
  await ClassApplication.findOneAndUpdate(
    { classId, tutorId },
    { $set: { classId, tutorId, status, rejectionReason: null, cancellationReason: null, ...extra } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
};

const seedApplications = async (classResult, tutorByUserIdx, approvedTutorIdxs) => {
  console.log("→ Seeding đơn ứng tuyển nhận lớp (mọi trạng thái)...");
  let count = 0;

  // MATCHED & COMPLETED: đơn APPROVED của tutor tương ứng
  for (const m of [...classResult.matched, ...classResult.completedList]) {
    const tutor = tutorByUserIdx[m.tutorIdx];
    await upsertApplication(m.classDoc._id, tutor._id, CLASS_APPLICATION_STATUS.APPROVED);
    count += 1;
  }

  // OPEN: rải đơn PENDING / REJECTED / CANCEL_REQUESTED / CANCELLED bởi các tutor approved khác nhau
  const opens = classResult.openClasses;
  const otherStatuses = [
    { status: CLASS_APPLICATION_STATUS.PENDING },
    { status: CLASS_APPLICATION_STATUS.PENDING },
    { status: CLASS_APPLICATION_STATUS.REJECTED, rejectionReason: "Gia sư chưa đáp ứng yêu cầu cấp độ của lớp." },
    { status: CLASS_APPLICATION_STATUS.CANCEL_REQUESTED, cancellationReason: "Gia sư xin hủy do thay đổi lịch cá nhân." },
    { status: CLASS_APPLICATION_STATUS.CANCELLED, cancellationReason: "Đã hủy nhận lớp theo thỏa thuận hai bên." },
  ];
  for (let i = 0; i < opens.length && i < otherStatuses.length * 2; i += 1) {
    const cfg = otherStatuses[i % otherStatuses.length];
    const tutorIdx = approvedTutorIdxs[(i + 3) % approvedTutorIdxs.length];
    const tutor = tutorByUserIdx[tutorIdx];
    const { status, ...extra } = cfg;
    await upsertApplication(opens[i].doc._id, tutor._id, status, extra);
    count += 1;
  }

  console.log(`✓ Đã seed ${count} đơn ứng tuyển.`);
};

// ──────────────────────────── 6) Thông báo ────────────────────────────

const seedNotifications = async (usersByIdx, seededUserIds) => {
  console.log("→ Seeding thông báo (đủ loại)...");
  // Idempotent: xóa thông báo cũ của các user demo rồi tạo lại
  await Notification.deleteMany({ userId: { $in: seededUserIds } });

  const T = NOTIFICATION_TYPES;
  const samples = [
    { idx: 78, type: T.TUTOR_PENDING, msg: "Hồ sơ gia sư của bạn đã được gửi và đang chờ admin duyệt." },
    { idx: 48, type: T.TUTOR_APPROVED, msg: "Chúc mừng! Hồ sơ gia sư của bạn đã được duyệt." },
    { idx: 90, type: T.TUTOR_REJECTED, msg: "Hồ sơ gia sư của bạn đã bị từ chối. Vui lòng xem lý do và đăng ký lại." },
    { idx: 0, type: T.CLASS_APPLICATION_PENDING, msg: "Có một gia sư vừa ứng tuyển nhận lớp 90020. Vui lòng duyệt." },
    { idx: 49, type: T.CLASS_APPLICATION_APPROVED, msg: "Đơn nhận lớp 90020 của bạn đã được duyệt." },
    { idx: 50, type: T.CLASS_APPLICATION_REJECTED, msg: "Đơn nhận lớp 90021 của bạn đã bị từ chối." },
    { idx: 79, type: T.PROFILE_CHANGE_PENDING, msg: "Yêu cầu đổi hồ sơ của bạn đang chờ admin duyệt." },
    { idx: 51, type: T.PROFILE_CHANGE_APPROVED, msg: "Yêu cầu đổi hồ sơ của bạn đã được duyệt." },
    { idx: 52, type: T.PROFILE_CHANGE_REJECTED, msg: "Yêu cầu đổi hồ sơ của bạn đã bị từ chối." },
    { idx: 53, type: T.CLASS_APPLICATION_CANCEL_REQUESTED, msg: "Gia sư đã gửi yêu cầu hủy nhận lớp 90022." },
    { idx: 54, type: T.CLASS_APPLICATION_CANCEL_APPROVED, msg: "Yêu cầu hủy nhận lớp 90022 đã được chấp nhận." },
    { idx: 55, type: T.CLASS_APPLICATION_CANCEL_REJECTED, msg: "Yêu cầu hủy nhận lớp 90023 đã bị từ chối." },
    { idx: 56, type: T.CLASS_APPLICATION_CANCELLED, msg: "Đơn nhận lớp 90024 đã bị hủy." },
    { idx: 3, type: T.CLASS_MATCHED, msg: "Bài đăng 90020 của bạn đã có gia sư nhận lớp." },
    { idx: 4, type: T.CLASS_EXPIRED, msg: "Bài đăng 90028 của bạn đã hết hạn do chưa có gia sư nhận." },
    { idx: 3, type: T.CLASS_COMPLETED_REWARD, msg: 'Lớp 90033 đã hoàn thành! Bạn nhận được mã giảm giá DEMO_RWPARENT1 (giảm 10%, tối đa 200.000đ). Xem trong "Kho mã giảm giá".' },
    { idx: 48, type: T.CLASS_COMPLETED_REWARD, msg: 'Lớp 90033 đã hoàn thành! Bạn nhận được mã giảm giá DEMO_RWTUTOR1 (giảm 10%, tối đa 200.000đ). Xem trong "Kho mã giảm giá".' },
  ];

  const docs = samples.map((s, i) => {
    const read = i % 3 === 0; // ~1/3 đã đọc
    return {
      userId: usersByIdx[s.idx]._id,
      type: s.type,
      message: s.msg,
      read,
      readAt: read ? daysAgo(randInt(0, 3)) : null,
    };
  });
  await Notification.insertMany(docs);

  console.log(`✓ Đã seed ${docs.length} thông báo (trộn đã đọc / chưa đọc).`);
};

// ──────────────────────────── 7) Yêu cầu đổi hồ sơ gia sư ────────────────────────────

const seedProfileChangeRequests = async (usersByIdx, tutorByUserIdx, adminId, seededUserIds) => {
  console.log("→ Seeding yêu cầu đổi hồ sơ gia sư...");
  await ProfileChangeRequest.deleteMany({ userId: { $in: seededUserIds } });

  const reqs = [
    { idx: 48, status: PROFILE_CHANGE_STATUS.PENDING, changes: { bio: "Cập nhật: bổ sung kinh nghiệm luyện thi THPT Quốc gia 3 năm.", schoolName: "Đại học Sư phạm Hà Nội" } },
    { idx: 49, status: PROFILE_CHANGE_STATUS.PENDING, changes: { subjects: ["Tiếng Anh", "Ngữ văn"] } },
    { idx: 50, status: PROFILE_CHANGE_STATUS.APPROVED, changes: { bio: "Đã cập nhật phương pháp giảng dạy mới." }, reviewed: true },
    { idx: 51, status: PROFILE_CHANGE_STATUS.REJECTED, changes: { phone: "0987654321" }, reviewed: true, reason: "Số điện thoại mới chưa được xác thực." },
  ];

  const docs = reqs.map((r) => ({
    tutorId: tutorByUserIdx[r.idx]._id,
    userId: usersByIdx[r.idx]._id,
    changes: r.changes,
    status: r.status,
    rejectionReason: r.reason || null,
    reviewedBy: r.reviewed ? adminId : null,
    reviewedAt: r.reviewed ? daysAgo(randInt(1, 5)) : null,
  }));
  await ProfileChangeRequest.insertMany(docs);

  console.log(`✓ Đã seed ${docs.length} yêu cầu đổi hồ sơ (pending / approved / rejected).`);
};

// ──────────────────────────── 8) Đánh giá gia sư (review) ────────────────────────────

const REVIEW_COMMENTS = [
  "Gia sư dạy rất tận tâm, con tôi tiến bộ rõ rệt sau khóa học. Cảm ơn thầy/cô nhiều!",
  "Phương pháp dễ hiểu, kiên nhẫn và luôn theo sát tiến độ. Rất hài lòng.",
  "Thầy/cô nhiệt tình, đúng giờ, bài giảng bám sát chương trình. Sẽ giới thiệu cho bạn bè.",
  "Con tôi từ mất gốc đã lấy lại được nền tảng, điểm số cải thiện đáng kể.",
  "Rất chuyên nghiệp và trách nhiệm, phản hồi phụ huynh thường xuyên.",
];

// Mỗi lớp COMPLETED → người đăng đánh giá gia sư 1 lần; cập nhật lại thống kê rating của gia sư.
const seedReviews = async (classResult, tutorByUserIdx) => {
  console.log("→ Seeding đánh giá gia sư cho các lớp đã hoàn thành...");
  const reviewDocs = [];
  const statByTutorId = {};

  classResult.completedList.forEach((c, i) => {
    const tutor = tutorByUserIdx[c.tutorIdx];
    const rating = randInt(4, 5);
    reviewDocs.push({
      tutorId: tutor._id,
      classId: c.classDoc._id,
      reviewerId: c.classDoc.createdBy,
      rating,
      comment: REVIEW_COMMENTS[i % REVIEW_COMMENTS.length],
    });
    const key = String(tutor._id);
    if (!statByTutorId[key]) statByTutorId[key] = { sum: 0, count: 0 };
    statByTutorId[key].sum += rating;
    statByTutorId[key].count += 1;
  });

  if (reviewDocs.length) await Review.insertMany(reviewDocs);

  // Đồng bộ ratingSum / reviewCount / averageRating của gia sư (như review.service làm).
  for (const [tutorId, s] of Object.entries(statByTutorId)) {
    await Tutor.updateOne(
      { _id: tutorId },
      {
        $set: {
          ratingSum: s.sum,
          reviewCount: s.count,
          averageRating: Math.round((s.sum / s.count) * 10) / 10,
        },
      },
    );
  }

  console.log(`✓ Đã seed ${reviewDocs.length} đánh giá + cập nhật rating cho ${Object.keys(statByTutorId).length} gia sư.`);
};

// ──────────────────────────── 9) Nhắn tin gia sư ↔ admin (chat) ────────────────────────────

// Kịch bản hội thoại mẫu (mỗi dòng: [vai trò người gửi, nội dung]).
const CHAT_THREADS = [
  {
    idx: 48,
    msgs: [
      ["tutor", "Em chào admin ạ, em muốn hỏi về quy trình nhận lớp trên hệ thống."],
      ["admin", "Chào bạn, bạn cứ ứng tuyển lớp phù hợp với môn và khu vực, sau khi người đăng chọn thì admin sẽ duyệt nhé."],
      ["tutor", "Dạ em hiểu rồi, em cảm ơn admin ạ!"],
    ],
    adminUnread: 0,
    tutorUnread: 0, // đã đọc cả hai phía
  },
  {
    idx: 49,
    msgs: [
      ["tutor", "Admin ơi, hồ sơ của em đã được duyệt nhưng em muốn bổ sung thêm môn dạy ạ."],
      ["tutor", "Em có thể dạy thêm Tiếng Anh giao tiếp nữa ạ."],
    ],
    adminUnread: 2, // gia sư gửi, admin chưa đọc
    tutorUnread: 0,
  },
  {
    idx: 50,
    msgs: [
      ["tutor", "Em muốn cập nhật khu vực dạy sang quận khác thì làm thế nào ạ?"],
      ["admin", "Bạn vào mục Hồ sơ → gửi yêu cầu đổi thông tin, admin sẽ duyệt trong 1-2 ngày nhé."],
    ],
    adminUnread: 0,
    tutorUnread: 1, // admin trả lời, gia sư chưa đọc
  },
  {
    idx: 51,
    msgs: [
      ["admin", "Chào bạn, trung tâm có lớp Toán lớp 9 ở khu vực của bạn, bạn quan tâm thì ứng tuyển nhé."],
      ["tutor", "Dạ vâng em cảm ơn admin, em sẽ xem và ứng tuyển ngay ạ."],
    ],
    adminUnread: 0,
    tutorUnread: 0,
  },
  {
    idx: 52,
    msgs: [
      ["tutor", "Admin cho em hỏi khi nào học phí lớp đã hoàn thành được thanh toán ạ?"],
    ],
    adminUnread: 1, // gia sư vừa nhắn, admin chưa đọc
    tutorUnread: 0,
  },
];

const seedConversations = async (usersByIdx, adminId) => {
  console.log("→ Seeding hội thoại nhắn tin gia sư ↔ admin...");
  let convCount = 0;
  let msgCount = 0;

  for (const thread of CHAT_THREADS) {
    const tutorUser = usersByIdx[thread.idx];
    const conv = await Conversation.findOneAndUpdate(
      { tutorUserId: tutorUser._id },
      { $set: { tutorUserId: tutorUser._id } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    // Mốc thời gian tăng dần để hiển thị đúng thứ tự (mỗi tin cách nhau ~3 phút).
    const baseTime = Date.now() - thread.msgs.length * 3 * 60 * 1000;
    const docs = thread.msgs.map((m, i) => {
      const at = new Date(baseTime + i * 3 * 60 * 1000);
      const isTutor = m[0] === "tutor";
      return {
        conversationId: conv._id,
        senderId: isTutor ? tutorUser._id : adminId,
        senderRole: isTutor ? CHAT_ROLES.TUTOR : CHAT_ROLES.ADMIN,
        content: m[1],
        createdAt: at,
        updatedAt: at,
      };
    });
    // timestamps:false để giữ nguyên createdAt đã set (đảm bảo thứ tự tin nhắn).
    await Message.insertMany(docs, { timestamps: false });

    const last = thread.msgs[thread.msgs.length - 1];
    await Conversation.updateOne(
      { _id: conv._id },
      {
        $set: {
          lastMessage: last[1],
          lastMessageAt: docs[docs.length - 1].createdAt,
          lastSenderRole: last[0] === "tutor" ? CHAT_ROLES.TUTOR : CHAT_ROLES.ADMIN,
          adminUnread: thread.adminUnread,
          tutorUnread: thread.tutorUnread,
        },
      },
    );

    convCount += 1;
    msgCount += docs.length;
  }

  console.log(`✓ Đã seed ${convCount} hội thoại + ${msgCount} tin nhắn (trộn đã đọc / chưa đọc).`);
};

// ──────────────────────────── Orchestrator ────────────────────────────

const main = async () => {
  assertSeedAllowed("seedFullDemo");
  await connect();

  const areas = await loadAreas();
  console.log(`• Có ${areas.length} tỉnh/thành mẫu để gán khu vực.`);
  const cfg = await ensurePricing();

  const hashed = await hashPassword(DEFAULT_PASSWORD);

  // 1) Users
  const userSeeds = buildUserSeeds();
  const usersByIdx = await seedUsers(userSeeds, hashed);
  const adminId = usersByIdx[0]._id;
  const seededUserIds = Object.values(usersByIdx).map((u) => u._id);
  await resetDemoData(seededUserIds);

  // 2) Tutors
  const tutorByUserIdx = await seedTutors(usersByIdx, areas);
  tutorByUserIdxGlobal = tutorByUserIdx;
  const approvedTutorIdxs = [];
  for (let i = 48; i <= 77; i += 1) approvedTutorIdxs.push(i);

  // 3) Promos
  const promoByCode = await seedPromos(usersByIdx, adminId);

  // 4) Classes (bài đăng)
  const classResult = await seedClasses(usersByIdx, areas, cfg, promoByCode, approvedTutorIdxs);

  // 5) Applications
  await seedApplications(classResult, tutorByUserIdx, approvedTutorIdxs);

  // 6) Notifications
  await seedNotifications(usersByIdx, seededUserIds);

  // 7) Profile change requests
  await seedProfileChangeRequests(usersByIdx, tutorByUserIdx, adminId, seededUserIds);

  // 8) Reviews (đánh giá gia sư cho lớp đã hoàn thành)
  await seedReviews(classResult, tutorByUserIdx);

  // 9) Conversations + messages (nhắn tin gia sư ↔ admin)
  await seedConversations(usersByIdx, adminId);

  console.log("\n✅ Seed dữ liệu demo toàn diện hoàn tất!");
  console.log("   • Admin demo:  admin@webtutor.dev");
  console.log(`   • Mật khẩu chung: ${DEFAULT_PASSWORD}`);
  console.log("   • Tài khoản Google (không mật khẩu): các user idx 13 & 97.");
  console.log("   • Có sẵn đánh giá gia sư + hội thoại chat gia sư↔admin để demo.");
  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error("\n❌ Seed thất bại:", err.message);
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
