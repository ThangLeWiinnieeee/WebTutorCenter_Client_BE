const mongoose = require("mongoose");
const {
  OCCUPATION_STATUS,
  TUTOR_STATUS,
  DAYS_OF_WEEK,
  PHONE_REGEX,
  TIME_REGEX,
} = require("../constants/tutor");

const availabilitySlotSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      required: [true, "Ngày trong tuần là bắt buộc"],
      enum: {
        values: DAYS_OF_WEEK,
        message: "Ngày không hợp lệ, phải là Mon–Sun",
      },
    },
    hour: {
      type: Number,
      required: [true, "Khung giờ là bắt buộc"],
      min: [0, "Khung giờ phải từ 0 đến 23"],
      max: [23, "Khung giờ phải từ 0 đến 23"],
    },
  },
  { _id: false }
);

const tutorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId là bắt buộc"],
      unique: true,
    },
    phone: {
      type: String,
      required: [true, "Số điện thoại liên hệ là bắt buộc"],
      trim: true,
      match: [PHONE_REGEX, "Số điện thoại không hợp lệ (VD: 0912345678 hoặc 84912345678)"],
    },
    subjects: {
      // Danh mục môn do admin quản lý trong DB → validate ở service layer, không enum cứng.
      type: [String],
      required: [true, "Danh sách môn học là bắt buộc"],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 1,
        message: "Phải chọn ít nhất 1 môn học",
      },
    },
    occupationStatus: {
      type: String,
      enum: {
        values: Object.values(OCCUPATION_STATUS),
        message: "Tình trạng nghề nghiệp không hợp lệ",
      },
      required: [true, "Tình trạng nghề nghiệp là bắt buộc"],
    },
    teachingAreas: {
      type: {
        province: { type: Number, required: [true, "Mã tỉnh/thành là bắt buộc"] },
        districts: {
          type: [Number],
          required: [true, "Danh sách quận/huyện là bắt buộc"],
          validate: {
            validator: (arr) => Array.isArray(arr) && arr.length >= 1,
            message: "Phải chọn ít nhất 1 quận/huyện",
          },
        },
      },
      required: [true, "Khu vực dạy là bắt buộc"],
      _id: false,
    },
    currentArea: {
      type: {
        province: { type: Number, required: [true, "Mã tỉnh/thành là bắt buộc"] },
        district: { type: Number, required: [true, "Mã quận/huyện là bắt buộc"] },
      },
      required: [true, "Khu vực hiện tại là bắt buộc"],
      _id: false,
    },
    schoolName: {
      type: String,
      required: [true, "Tên trường là bắt buộc"],
      trim: true,
      minlength: [2, "Tên trường phải có ít nhất 2 ký tự"],
      maxlength: [200, "Tên trường không được vượt quá 200 ký tự"],
    },
    graduationYear: {
      type: Number,
      default: null,
      // Defensive: chuỗi rỗng/whitespace → null để Number không cast thành 0/NaN
      set: (v) => {
        if (v === "" || v === undefined) return null;
        if (typeof v === "string" && v.trim() === "") return null;
        return v;
      },
      min: [1950, "Năm tốt nghiệp không hợp lệ"],
      max: [new Date().getFullYear(), "Năm tốt nghiệp không được lớn hơn năm hiện tại"],
    },
    bio: {
      type: String,
      required: [true, "Phần giới thiệu bản thân là bắt buộc"],
      trim: true,
      minlength: [10, "Phần giới thiệu phải có ít nhất 10 ký tự"],
      maxlength: [2000, "Phần giới thiệu không được vượt quá 2000 ký tự"],
    },
    // Ảnh CCCD/CMND để xác thực danh tính gia sư (bắt buộc khi đăng ký).
    // Chỉ admin (duyệt hồ sơ) và chính gia sư được xem — không lộ ở endpoint công khai.
    cccdFrontImage: {
      type: String,
      required: [true, "Ảnh CCCD mặt trước là bắt buộc"],
      trim: true,
    },
    cccdBackImage: {
      type: String,
      required: [true, "Ảnh CCCD mặt sau là bắt buộc"],
      trim: true,
    },
    // Ảnh thẻ sinh viên mặt trước / mặt sau — mặt trước bắt buộc khi tình trạng là "sinh viên".
    studentCardFrontImage: {
      type: String,
      default: null,
      trim: true,
    },
    studentCardBackImage: {
      type: String,
      default: null,
      trim: true,
    },
    // Ảnh bằng cấp (tối đa 5 ảnh) — bắt buộc khi đã tốt nghiệp / giáo viên.
    certificateImages: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => !Array.isArray(arr) || arr.length <= 5,
        message: "Tối đa 5 ảnh bằng cấp",
      },
    },
    // Ảnh bằng cấp CÔNG KHAI (tùy chọn, tối đa 5) — gia sư chủ động cho mọi người xem ở
    // trang chi tiết & hồ sơ. KHÁC certificateImages (ảnh xác thực, riêng tư). Không bắt buộc.
    publicCertificateImages: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => !Array.isArray(arr) || arr.length <= 5,
        message: "Tối đa 5 ảnh bằng cấp công khai",
      },
    },
    status: {
      type: String,
      enum: Object.values(TUTOR_STATUS),
      default: TUTOR_STATUS.PENDING,
    },
    rejectionReason: {
      type: String,
      default: null,
      trim: true,
    },
    availability: {
      type: [availabilitySlotSchema],
      required: [true, "Lịch giảng dạy là bắt buộc"],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 1,
        message: "Phải có ít nhất 1 khung giờ giảng dạy",
      },
    },
    totalClassesAccepted: {
      type: Number,
      default: 0,
      min: [0, "Số lớp không thể âm"],
    },
    classesAcceptedThisMonth: {
      type: Number,
      default: 0,
      min: [0, "Số lớp không thể âm"],
    },
    // Thống kê đánh giá (cập nhật lại mỗi khi có đánh giá mới / bị xóa mềm / khôi phục).
    // averageRating = ratingSum / reviewCount (0 nếu chưa có đánh giá nào).
    ratingSum: {
      type: Number,
      default: 0,
      min: [0, "Tổng số sao không thể âm"],
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: [0, "Số lượt đánh giá không thể âm"],
    },
    averageRating: {
      type: Number,
      default: 0,
      min: [0, "Điểm đánh giá không thể âm"],
      max: [5, "Điểm đánh giá tối đa là 5"],
    },
    // Mức độ quan tâm theo môn (tên môn → { s: điểm, t: mốc thời gian cập nhật ms }), cộng dồn
    // có SUY GIẢM theo thời gian khi gia sư xem/ứng tuyển lớp của môn đó. Dùng để cá nhân hóa
    // thứ tự feed (môn tương tác nhiều & gần đây lên đầu). Số key = số môn gia sư từng tương tác
    // nên nhỏ. Mặc định rỗng → gia sư mới rơi về sort theo bài mới nhất. Xem constants SUBJECT_AFFINITY.
    subjectAffinity: {
      type: Map,
      of: new mongoose.Schema({ s: Number, t: Number }, { _id: false }),
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Validate cặp (status, rejectionReason) — chạy ở cả document context và query context
function assertRejectionReasonConsistency(status, rejectionReason) {
  const reason = typeof rejectionReason === "string" ? rejectionReason.trim() : null;
  if (status === TUTOR_STATUS.REJECTED && !reason) {
    return new Error("Lý do từ chối là bắt buộc khi hồ sơ bị từ chối");
  }
  if (status && status !== TUTOR_STATUS.REJECTED && reason) {
    return new Error("Lý do từ chối chỉ được điền khi hồ sơ bị từ chối");
  }
  return null;
}

tutorSchema.pre("save", function (next) {
  const err = assertRejectionReasonConsistency(this.status, this.rejectionReason);
  return next(err || undefined);
});

async function validateRejectionReasonOnUpdate(next) {
  const update = this.getUpdate() || {};
  const set = update.$set || update;
  const unset = update.$unset || {};

  const isStatusChanging = Object.prototype.hasOwnProperty.call(set, "status");
  const isReasonChanging =
    Object.prototype.hasOwnProperty.call(set, "rejectionReason") ||
    Object.prototype.hasOwnProperty.call(unset, "rejectionReason");

  if (!isStatusChanging && !isReasonChanging) return next();

  let nextStatus = set.status;
  let nextReason = Object.prototype.hasOwnProperty.call(unset, "rejectionReason")
    ? null
    : set.rejectionReason;

  if (!isStatusChanging || !isReasonChanging) {
    try {
      const current = await this.model.findOne(this.getQuery()).lean();
      if (!current) return next();
      if (!isStatusChanging) nextStatus = current.status;
      if (!isReasonChanging) nextReason = current.rejectionReason;
    } catch (err) {
      return next(err);
    }
  }

  const err = assertRejectionReasonConsistency(nextStatus, nextReason);
  return next(err || undefined);
}

tutorSchema.pre("findOneAndUpdate", validateRejectionReasonOnUpdate);

// Index cho query nóng nhất: tìm kiếm/lọc gia sư (searchTutors) và top gia sư uy tín
// (findTrustedTutorIds) — trước đây collection chỉ có unique userId nên mọi filter đều
// quét toàn bộ. Cả 2 luôn $match theo status trước, rồi lọc theo khu vực / lọc theo đánh giá.
// ponytail: 2 index đủ cho các filter phổ biến; sort chạy trên field tính động (_reviewCount)
// nên không dùng được index sort — chấp nhận in-memory sort tới khi số gia sư lên chục nghìn.
tutorSchema.index({ status: 1, "teachingAreas.province": 1, "teachingAreas.districts": 1 });
tutorSchema.index({ status: 1, reviewCount: -1, averageRating: -1 });

const Tutor = mongoose.model("Tutor", tutorSchema);

module.exports = Tutor;
module.exports.TUTOR_STATUS = TUTOR_STATUS;
