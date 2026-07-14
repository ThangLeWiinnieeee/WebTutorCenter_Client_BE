const mongoose = require("mongoose");
const Tutor = require("../models/tutor.model");
const { TUTOR_STATUS } = require("../constants/tutor");

const POPULATE_USER = "fullName email gender dateOfBirth avatar phone";

// Tìm kiếm khớp không dấu + không phân biệt hoa/thường (dùng chung toàn hệ thống).
const {
  buildDiacriticInsensitivePattern,
  diacriticInsensitiveRegex,
} = require("../utils/search");

const findByUserId = async (userId) => {
  return await Tutor.findOne({ userId });
};

const findById = async (id) => {
  return await Tutor.findById(id).populate("userId", POPULATE_USER);
};

const create = async (tutorData) => {
  const tutor = new Tutor(tutorData);
  return await tutor.save();
};

const update = async (tutorId, updateData) => {
  return await Tutor.findByIdAndUpdate(tutorId, updateData, { new: true, runValidators: true })
    .populate("userId", POPULATE_USER);
};

// Một trang hồ sơ gia sư đang chờ duyệt, mới nhất trước.
const findPendingPage = async ({ page = 1, limit = 10 }) => {
  const skip = (Math.max(1, page) - 1) * limit;
  return await Tutor.find({ status: TUTOR_STATUS.PENDING })
    .populate("userId", POPULATE_USER)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

const countByStatus = async (status) => {
  return await Tutor.countDocuments({ status });
};

// Lấy danh sách tất cả gia sư đã approved, sắp xếp theo totalClassesAccepted (giảm dần)
const findAllApproved = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const tutors = await Tutor.find({ status: TUTOR_STATUS.APPROVED })
    .populate("userId", POPULATE_USER)
    .sort({ totalClassesAccepted: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const total = await Tutor.countDocuments({ status: TUTOR_STATUS.APPROVED });
  
  return { tutors, total, page, limit };
};

// Lấy top gia sư nổi bật (sắp xếp theo tổng số lần nhận lớp)
const findTopTutors = async (limit = 10) => {
  return await Tutor.find({ status: TUTOR_STATUS.APPROVED })
    .populate("userId", POPULATE_USER)
    .sort({ totalClassesAccepted: -1, createdAt: -1 })
    .limit(limit);
};

// Lấy top gia sư tháng hiện tại (sắp xếp theo classesAcceptedThisMonth)
const findTopTutorsThisMonth = async (limit = 10) => {
  return await Tutor.find({ status: TUTOR_STATUS.APPROVED })
    .populate("userId", POPULATE_USER)
    .sort({ classesAcceptedThisMonth: -1, totalClassesAccepted: -1 })
    .limit(limit);
};

// Lấy gia sư mới (approved trong N ngày gần đây)
const findNewTutors = async (days = 7, limit = 10) => {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);
  
  return await Tutor.find({
    status: TUTOR_STATUS.APPROVED,
    updatedAt: { $gte: dateThreshold },
  })
    .populate("userId", POPULATE_USER)
    .sort({ updatedAt: -1 })
    .limit(limit);
};

// Top gia sư uy tín: xếp hạng bằng điểm Bayesian (IMDb) để cân bằng giữa SỐ LƯỢNG
// đánh giá và ĐIỂM trung bình — tránh việc 1 đánh giá 5 sao vượt mặt người có nhiều
// đánh giá điểm cao. Trả về mảng _id của top `limit` gia sư đã duyệt & có đánh giá.
//   score = (v/(v+m))*R + (m/(v+m))*C
//   v = reviewCount, R = averageRating, C = điểm trung bình toàn cục, m = hằng số làm mượt
const TRUSTED_BAYESIAN_M = 5;

const findTrustedTutorIds = async (limit = 10) => {
  const baseMatch = { status: TUTOR_STATUS.APPROVED, reviewCount: { $gte: 1 } };

  // C = tổng số sao / tổng lượt đánh giá trên toàn bộ gia sư đã duyệt có đánh giá.
  const [global] = await Tutor.aggregate([
    { $match: baseMatch },
    { $group: { _id: null, sumRating: { $sum: "$ratingSum" }, sumCount: { $sum: "$reviewCount" } } },
  ]);
  if (!global || !global.sumCount) return [];
  const C = global.sumRating / global.sumCount;
  const m = TRUSTED_BAYESIAN_M;

  const docs = await Tutor.aggregate([
    { $match: baseMatch },
    {
      $addFields: {
        _trustScore: {
          $add: [
            {
              $multiply: [
                { $divide: ["$reviewCount", { $add: ["$reviewCount", m] }] },
                "$averageRating",
              ],
            },
            { $multiply: [{ $divide: [m, { $add: ["$reviewCount", m] }] }, C] },
          ],
        },
      },
    },
    { $sort: { _trustScore: -1, reviewCount: -1, averageRating: -1, createdAt: -1 } },
    { $limit: limit },
    { $project: { _id: 1 } },
  ]);

  return docs.map((d) => d._id);
};

// Tìm kiếm & lọc gia sư đã duyệt.
// Toàn bộ điều kiện lọc (kể cả dữ liệu nằm ở User: tên, giới tính, năm sinh) đều được
// áp dụng ở tầng DB qua aggregation TRƯỚC khi phân trang & đếm tổng → kết quả và số
// trang luôn chính xác. (Trước đây gender/yearOfBirth bị lọc sau khi đã skip/limit nên
// trả về thiếu kết quả và tổng số sai.)
const searchTutors = async (filters = {}, page = 1, limit = 20) => {
  const safePage = Math.max(1, Number(page) || 1);
  const skip = (safePage - 1) * limit;

  // Điều kiện ở cấp Tutor
  const tutorMatch = { status: TUTOR_STATUS.APPROVED };
  if (filters.subject) {
    // Khớp chính xác tên môn (không dấu + không phân biệt hoa/thường)
    tutorMatch.subjects = { $regex: `^${buildDiacriticInsensitivePattern(filters.subject)}$`, $options: "i" };
  }
  if (filters.occupationStatus) {
    tutorMatch.occupationStatus = filters.occupationStatus;
  }
  if (filters.province != null && filters.province !== "") {
    tutorMatch["teachingAreas.province"] = Number(filters.province);
  }
  if (filters.district != null && filters.district !== "") {
    tutorMatch["teachingAreas.districts"] = Number(filters.district);
  }

  // Điều kiện ở cấp User (cần join sang collection users)
  const userMatch = {};
  if (filters.gender) {
    userMatch["userId.gender"] = filters.gender;
  }
  if (filters.name && String(filters.name).trim()) {
    // Tìm theo tên gia sư (khớp một phần, không dấu + không phân biệt hoa/thường)
    userMatch["userId.fullName"] = { $regex: buildDiacriticInsensitivePattern(filters.name), $options: "i" };
  }
  if (filters.yearOfBirth) {
    const year = parseInt(filters.yearOfBirth, 10);
    if (!Number.isNaN(year)) {
      // Bỏ qua gia sư chưa có ngày sinh trước khi lấy $year (tránh lỗi/khớp sai)
      userMatch.$expr = {
        $and: [
          { $ne: ["$userId.dateOfBirth", null] },
          { $eq: [{ $year: "$userId.dateOfBirth" }, year] },
        ],
      };
    }
  }

  const pipeline = [
    { $match: tutorMatch },
    {
      // Thay field userId (ObjectId) bằng tài liệu user đã rút gọn → giữ tương thích
      // với TutorMapper (đọc tutor.userId.fullName/email/...).
      $lookup: {
        from: "users",
        let: { uid: "$userId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$uid"] } } },
          { $project: { fullName: 1, email: 1, gender: 1, dateOfBirth: 1, avatar: 1, phone: 1 } },
        ],
        as: "userId",
      },
    },
    { $unwind: "$userId" },
  ];

  if (Object.keys(userMatch).length) {
    pipeline.push({ $match: userMatch });
  }

  // Chuẩn hóa field đánh giá (tài liệu cũ có thể thiếu) để sắp xếp ổn định
  pipeline.push({
    $addFields: {
      _reviewCount: { $ifNull: ["$reviewCount", 0] },
      _averageRating: { $ifNull: ["$averageRating", 0] },
    },
  });

  pipeline.push({
    $facet: {
      items: [
        // Ưu tiên gia sư có nhiều đánh giá & điểm sao cao (cao → thấp),
        // sau đó tới số lớp đã nhận và gia sư mới hơn để phá hòa.
        { $sort: { _reviewCount: -1, _averageRating: -1, totalClassesAccepted: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ],
      total: [{ $count: "count" }],
    },
  });

  const result = await Tutor.aggregate(pipeline);
  const tutors = result[0]?.items || [];
  const total = result[0]?.total?.[0]?.count || 0;

  return { tutors, total, page: safePage, limit };
};

// Danh sách gia sư đã duyệt (kèm tên từ User) cho khu vực admin quản lý đánh giá.
// Hỗ trợ tìm theo tên + phân trang; sắp xếp theo số lượt đánh giá giảm dần.
const findApprovedForReviewAdmin = async ({ page = 1, limit = 10, keyword = "" } = {}) => {
  const skip = (Math.max(1, page) - 1) * limit;
  const pipeline = [
    { $match: { status: TUTOR_STATUS.APPROVED } },
    { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
  ];

  if (keyword && keyword.trim()) {
    const pattern = diacriticInsensitiveRegex(keyword);
    pipeline.push({ $match: { "user.fullName": pattern } });
  }

  pipeline.push({
    $facet: {
      items: [
        { $sort: { reviewCount: -1, averageRating: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            subjects: 1,
            averageRating: 1,
            reviewCount: 1,
            "user._id": 1,
            "user.fullName": 1,
            "user.email": 1,
            "user.avatar": 1,
          },
        },
      ],
      total: [{ $count: "count" }],
    },
  });

  const result = await Tutor.aggregate(pipeline);
  const items = result[0]?.items || [];
  const totalItems = result[0]?.total?.[0]?.count || 0;
  return { items, totalItems };
};

// --- Điểm quan tâm theo môn với suy giảm theo thời gian (half-life) ---
// Toàn bộ công thức decay gom ở đây để chỉ có MỘT nguồn: ghi (nextAffinityEntry) và đọc
// (decayAffinityMap) dùng chung `decay()`.
const { SUBJECT_AFFINITY } = require("../constants/tutor");

// Điểm còn lại sau khi để `ageMs` mili giây trôi qua: cứ mỗi HALF_LIFE_MS thì giảm còn một nửa.
const decay = (score, ageMs) =>
  score * Math.pow(0.5, Math.max(0, ageMs) / SUBJECT_AFFINITY.HALF_LIFE_MS);

// Trạng thái điểm mới sau một lần tương tác: suy giảm điểm cũ về thời điểm `now` rồi cộng
// `weight`, chặn trần MAX_SCORE. prev = { s, t } hoặc null (chưa từng tương tác).
const nextAffinityEntry = (prev, weight, now) => {
  const decayed = prev ? decay(prev.s, now - prev.t) : 0;
  return { s: Math.min(SUBJECT_AFFINITY.MAX_SCORE, decayed + weight), t: now };
};

// Đọc điểm quan tâm hiện tại theo môn (đã suy giảm về `now`), bỏ các môn dưới ngưỡng MIN_SCORE.
// Nhận Map (document Mongoose) hoặc object thường (lean); trả { [tên môn]: điểm }.
const decayAffinityMap = (subjectAffinity, now = Date.now()) => {
  const entries =
    subjectAffinity instanceof Map ? subjectAffinity.entries() : Object.entries(subjectAffinity || {});
  const result = {};
  for (const [subject, entry] of entries) {
    if (!entry) continue;
    const score = decay(entry.s, now - entry.t);
    if (score >= SUBJECT_AFFINITY.MIN_SCORE) result[subject] = score;
  }
  return result;
};

// Ghi nhận một lần tương tác của gia sư với một môn (đọc-sửa-ghi để suy giảm điểm cũ trước khi cộng).
// Bỏ qua khi thiếu tham số hoặc tên môn chứa "." (không hợp lệ làm key trong document Mongo).
// ponytail: hai lần tương tác đồng thời có thể mất 1 lượt cộng (race) — chấp nhận với dữ liệu telemetry.
const incrementSubjectAffinity = async (userId, subject, weight, now = Date.now()) => {
  if (!userId || !subject || !weight || subject.includes(".")) return null;
  const path = `subjectAffinity.${subject}`;
  const doc = await Tutor.findOne({ userId }, { [path]: 1 }).lean();
  const prev = doc?.subjectAffinity?.[subject] || null;
  return await Tutor.updateOne({ userId }, { $set: { [path]: nextAffinityEntry(prev, weight, now) } });
};

// Xóa hồ sơ gia sư của một người dùng (xóa vĩnh viễn tài khoản)
const deleteByUserId = async (userId) => {
  return await Tutor.findOneAndDelete({ userId });
};

module.exports = {
  findByUserId,
  findApprovedForReviewAdmin,
  findTopTutorsThisMonth,
  findById,
  findTrustedTutorIds,
  create,
  update,
  findPendingPage,
  countByStatus,
  findAllApproved,
  findTopTutors,
  findNewTutors,
  searchTutors,
  incrementSubjectAffinity,
  decayAffinityMap,
  nextAffinityEntry,
  deleteByUserId,
};
