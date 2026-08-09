const Joi = require("joi");
const {
  OCCUPATION_STATUS,
  GENDER_OPTIONS,
  PHONE_REGEX,
  TIME_REGEX,
  DAYS_OF_WEEK,
} = require("../constants/tutor");
const { validate, validateQuery } = require("../middlewares/validate.middleware");

const activeTutorsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

const topTutorsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10),
});

const newTutorsQuerySchema = Joi.object({
  days: Joi.number().integer().min(1).max(365).default(7),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

const searchTutorsQuerySchema = Joi.object({
  name: Joi.string().trim().allow("").max(100).optional(),
  subject: Joi.string().trim().allow("").max(100).optional(),
  occupationStatus: Joi.string()
    .valid(...Object.values(OCCUPATION_STATUS))
    .allow("")
    .optional(),
  gender: Joi.string().valid(...GENDER_OPTIONS).allow("").optional(),
  yearOfBirth: Joi.number().integer().min(1900).max(new Date().getFullYear()).optional(),
  province: Joi.number().integer().positive().optional(),
  district: Joi.number().integer().positive().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

const availabilitySlotSchema = Joi.object({
  day: Joi.string()
    .valid(...DAYS_OF_WEEK)
    .required()
    .messages({
      "any.only": "Ngày không hợp lệ, phải là Mon–Sun",
      "any.required": "Ngày trong tuần là bắt buộc",
      "string.empty": "Ngày trong tuần không được để trống",
    }),
  hour: Joi.number().integer().min(0).max(23).required().messages({
    "number.min": "Khung giờ phải từ 0 đến 23",
    "number.max": "Khung giờ phải từ 0 đến 23",
    "any.required": "Khung giờ là bắt buộc",
  }),
});

const registerTutorSchema = Joi.object({
  phone: Joi.string()
    .pattern(PHONE_REGEX)
    .required()
    .messages({
      "string.pattern.base": "Số điện thoại không hợp lệ (VD: 0912345678 hoặc 84912345678)",
      "any.required": "Số điện thoại liên hệ là bắt buộc",
      "string.empty": "Số điện thoại liên hệ không được để trống",
    }),

  // Danh mục môn do admin quản lý trong DB → membership được kiểm tra ở tutor.service.
  subjects: Joi.array()
    .items(Joi.string().trim().max(100))
    .min(1)
    .required()
    .messages({
      "array.min": "Phải chọn ít nhất 1 môn học",
      "any.required": "Môn học là bắt buộc",
      "array.base": "Môn học phải là một mảng",
    }),

  occupationStatus: Joi.string()
    .valid(...Object.values(OCCUPATION_STATUS))
    .required()
    .messages({
      "any.only": "Tình trạng nghề nghiệp không hợp lệ (chỉ chấp nhận: student, graduated, teacher)",
      "any.required": "Tình trạng nghề nghiệp là bắt buộc",
      "string.empty": "Tình trạng nghề nghiệp không được để trống",
    }),

  teachingAreas: Joi.object({
    province: Joi.number().integer().required().messages({
      "number.base": "Mã tỉnh/thành phải là số",
      "any.required": "Mã tỉnh/thành là bắt buộc",
    }),
    districts: Joi.array()
      .items(Joi.number().integer().messages({ "number.base": "Mã quận/huyện phải là số" }))
      .min(1)
      .required()
      .messages({
        "array.min": "Phải chọn ít nhất 1 quận/huyện",
        "any.required": "Danh sách quận/huyện là bắt buộc",
        "array.base": "Danh sách quận/huyện phải là một mảng",
      }),
  })
    .required()
    .messages({
      "any.required": "Khu vực dạy là bắt buộc",
      "object.base": "Khu vực dạy không hợp lệ",
    }),

  currentArea: Joi.object({
    province: Joi.number().integer().required().messages({
      "number.base": "Mã tỉnh/thành phải là số",
      "any.required": "Mã tỉnh/thành là bắt buộc",
    }),
    district: Joi.number().integer().required().messages({
      "number.base": "Mã quận/huyện phải là số",
      "any.required": "Mã quận/huyện là bắt buộc",
    }),
  })
    .required()
    .messages({
      "any.required": "Khu vực hiện tại là bắt buộc",
      "object.base": "Khu vực hiện tại không hợp lệ",
    }),

  schoolName: Joi.string().min(2).max(200).required().messages({
    "string.empty": "Tên trường không được để trống",
    "string.min": "Tên trường phải có ít nhất 2 ký tự",
    "string.max": "Tên trường không được vượt quá 200 ký tự",
    "any.required": "Tên trường là bắt buộc",
  }),

  graduationYear: Joi.number()
    .integer()
    .min(1950)
    .max(new Date().getFullYear())
    // "" → undefined (Joi sẽ bỏ qua), tránh để Mongoose Number cast "" thành NaN/0
    .empty("")
    .allow(null)
    .optional()
    .messages({
      "number.base": "Năm tốt nghiệp phải là số",
      "number.integer": "Năm tốt nghiệp phải là số nguyên",
      "number.min": "Năm tốt nghiệp phải từ 1950 trở lên",
      "number.max": `Năm tốt nghiệp không được lớn hơn ${new Date().getFullYear()}`,
    }),

  bio: Joi.string().min(10).max(2000).required().messages({
    "string.empty": "Phần giới thiệu bản thân không được để trống",
    "string.min": "Phần giới thiệu bản thân phải có ít nhất 10 ký tự",
    "string.max": "Phần giới thiệu bản thân không được vượt quá 2000 ký tự",
    "any.required": "Phần giới thiệu bản thân là bắt buộc",
  }),

  availability: Joi.array()
    .items(availabilitySlotSchema)
    .min(1)
    .required()
    .custom((slots, helpers) => {
      if (!Array.isArray(slots) || slots.length < 2) return slots;
      const seen = new Set();
      for (const slot of slots) {
        if (!slot || !slot.day || slot.hour === undefined) continue;
        const key = `${slot.day}-${slot.hour}`;
        if (seen.has(key)) {
          return helpers.message({
            custom: `Trùng lịch giảng dạy: ngày ${slot.day} lúc ${slot.hour}h đã được chọn nhiều lần`,
          });
        }
        seen.add(key);
      }
      return slots;
    })
    .messages({
      "array.base": "Lịch giảng dạy phải là một mảng",
      "array.min": "Phải có ít nhất 1 khung giờ giảng dạy",
      "any.required": "Lịch giảng dạy là bắt buộc",
    }),

  // Ảnh giấy tờ xác thực (URL Cloudinary đã upload trước qua /tutors/upload-document)
  cccdFrontImage: Joi.string().uri().required().messages({
    "string.empty": "Vui lòng tải ảnh CCCD mặt trước",
    "string.uri": "Ảnh CCCD mặt trước không hợp lệ",
    "any.required": "Ảnh CCCD mặt trước là bắt buộc",
  }),

  cccdBackImage: Joi.string().uri().required().messages({
    "string.empty": "Vui lòng tải ảnh CCCD mặt sau",
    "string.uri": "Ảnh CCCD mặt sau không hợp lệ",
    "any.required": "Ảnh CCCD mặt sau là bắt buộc",
  }),

  // Thẻ sinh viên mặt trước: bắt buộc khi là sinh viên. Mặt sau: tùy chọn.
  studentCardFrontImage: Joi.string()
    .uri()
    .when("occupationStatus", {
      is: "student",
      then: Joi.required(),
      otherwise: Joi.optional().allow(null, ""),
    })
    .messages({
      "string.empty": "Vui lòng tải ảnh thẻ sinh viên mặt trước",
      "string.uri": "Ảnh thẻ sinh viên mặt trước không hợp lệ",
      "any.required": "Ảnh thẻ sinh viên mặt trước là bắt buộc",
    }),

  // Thẻ sinh viên mặt sau: cũng bắt buộc khi là sinh viên.
  studentCardBackImage: Joi.string()
    .uri()
    .when("occupationStatus", {
      is: "student",
      then: Joi.required(),
      otherwise: Joi.optional().allow(null, ""),
    })
    .messages({
      "string.empty": "Vui lòng tải ảnh thẻ sinh viên mặt sau",
      "string.uri": "Ảnh thẻ sinh viên mặt sau không hợp lệ",
      "any.required": "Ảnh thẻ sinh viên mặt sau là bắt buộc",
    }),

  // Bằng cấp: bắt buộc tối thiểu 1 (tối đa 5) khi đã tốt nghiệp / giáo viên, ngược lại bỏ qua.
  certificateImages: Joi.array()
    .items(Joi.string().uri().messages({ "string.uri": "Ảnh bằng cấp không hợp lệ" }))
    .max(5)
    .when("occupationStatus", {
      is: Joi.valid("graduated", "teacher"),
      then: Joi.array().min(1).required(),
      otherwise: Joi.array().default([]),
    })
    .messages({
      "array.base": "Danh sách bằng cấp phải là một mảng",
      "array.max": "Tối đa 5 ảnh bằng cấp",
      "array.min": "Vui lòng tải lên ít nhất 1 ảnh bằng cấp",
      "any.required": "Ảnh bằng cấp là bắt buộc",
    }),

  // Bằng cấp công khai (tùy chọn) — gia sư cho mọi người xem; tối đa 5, không bắt buộc.
  publicCertificateImages: Joi.array()
    .items(Joi.string().uri().messages({ "string.uri": "Ảnh bằng cấp công khai không hợp lệ" }))
    .max(5)
    .default([])
    .messages({
      "array.base": "Danh sách bằng cấp công khai phải là một mảng",
      "array.max": "Tối đa 5 ảnh bằng cấp công khai",
    }),
});

const rejectTutorSchema = Joi.object({
  rejectionReason: Joi.string().trim().min(5).max(500).required().messages({
    "string.empty": "Lý do từ chối không được để trống",
    "string.min": "Lý do từ chối phải có ít nhất 5 ký tự",
    "string.max": "Lý do từ chối không được vượt quá 500 ký tự",
    "any.required": "Lý do từ chối là bắt buộc",
  }),
});

// Gia sư đổi hồ sơ (chờ duyệt) — chỉ các field được phép, tất cả optional, cần ít nhất 1.
const profileChangeRequestSchema = Joi.object({
  phone: Joi.string().pattern(PHONE_REGEX).messages({
    "string.pattern.base": "Số điện thoại không hợp lệ (VD: 0912345678 hoặc 84912345678)",
  }),
  occupationStatus: Joi.string()
    .valid(...Object.values(OCCUPATION_STATUS))
    .messages({ "any.only": "Tình trạng nghề nghiệp không hợp lệ" }),
  // Danh mục môn do admin quản lý trong DB → membership được kiểm tra ở service.
  subjects: Joi.array()
    .items(Joi.string().trim().max(100))
    .min(1)
    .messages({
      "array.min": "Phải chọn ít nhất 1 môn học",
      "array.base": "Môn học phải là một mảng",
    }),
  graduationYear: Joi.number()
    .integer()
    .min(1950)
    .max(new Date().getFullYear())
    .empty("")
    .allow(null)
    .messages({
      "number.base": "Năm tốt nghiệp phải là số",
      "number.integer": "Năm tốt nghiệp phải là số nguyên",
      "number.min": "Năm tốt nghiệp phải từ 1950 trở lên",
      "number.max": `Năm tốt nghiệp không được lớn hơn ${new Date().getFullYear()}`,
    }),
  teachingAreas: Joi.object({
    province: Joi.number().integer().required().messages({ "any.required": "Mã tỉnh/thành là bắt buộc" }),
    districts: Joi.array()
      .items(Joi.number().integer())
      .min(1)
      .required()
      .messages({ "array.min": "Phải chọn ít nhất 1 quận/huyện" }),
  }),
  currentArea: Joi.object({
    province: Joi.number().integer().required().messages({ "any.required": "Mã tỉnh/thành là bắt buộc" }),
    district: Joi.number().integer().required().messages({ "any.required": "Mã quận/huyện là bắt buộc" }),
  }),
  bio: Joi.string().min(10).max(2000).messages({
    "string.min": "Phần giới thiệu bản thân phải có ít nhất 10 ký tự",
    "string.max": "Phần giới thiệu bản thân không được vượt quá 2000 ký tự",
  }),
  availability: Joi.array()
    .items(availabilitySlotSchema)
    .min(1)
    .messages({ "array.min": "Phải có ít nhất 1 khung giờ giảng dạy" }),

  // Bổ sung / cập nhật hồ sơ chứng thực (qua duyệt). Tính đầy đủ kiểm tra ở service.
  cccdFrontImage: Joi.string().uri().messages({ "string.uri": "Ảnh CCCD mặt trước không hợp lệ" }),
  cccdBackImage: Joi.string().uri().messages({ "string.uri": "Ảnh CCCD mặt sau không hợp lệ" }),
  studentCardFrontImage: Joi.string()
    .uri()
    .allow(null, "")
    .messages({ "string.uri": "Ảnh thẻ sinh viên mặt trước không hợp lệ" }),
  studentCardBackImage: Joi.string()
    .uri()
    .allow(null, "")
    .messages({ "string.uri": "Ảnh thẻ sinh viên mặt sau không hợp lệ" }),
  certificateImages: Joi.array()
    .items(Joi.string().uri().messages({ "string.uri": "Ảnh bằng cấp không hợp lệ" }))
    .max(5)
    .messages({ "array.max": "Tối đa 5 ảnh bằng cấp" }),

  // Bằng cấp công khai — cho phép bổ sung / cập nhật / gỡ (mảng rỗng), qua duyệt.
  publicCertificateImages: Joi.array()
    .items(Joi.string().uri().messages({ "string.uri": "Ảnh bằng cấp công khai không hợp lệ" }))
    .max(5)
    .messages({ "array.max": "Tối đa 5 ảnh bằng cấp công khai" }),
})
  .min(1)
  .messages({ "object.min": "Vui lòng cung cấp ít nhất một thông tin để cập nhật" });

module.exports = {
  registerTutorSchema,
  rejectTutorSchema,
  profileChangeRequestSchema,
  validate,
  validateQuery,
  activeTutorsQuerySchema,
  topTutorsQuerySchema,
  newTutorsQuerySchema,
  searchTutorsQuerySchema,
};
