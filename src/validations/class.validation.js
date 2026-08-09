const Joi = require("joi");
const { GENDER_OPTIONS, TUTOR_LEVEL_OPTIONS, DAYS_OF_WEEK, PHONE_REGEX } = require("../constants/tutor");
const { CLASS_APPLICATION_STATUS } = require("../constants/classApplication");
const { validateBody, validateQuery } = require("../middlewares/validate.middleware");

const availabilitySlotSchema = Joi.object({
  day: Joi.string()
    .valid(...DAYS_OF_WEEK)
    .required(),
  hour: Joi.number().integer().min(0).max(23).required(),
});

const baseClassSchema = Joi.object({
  contactPhone: Joi.string().pattern(PHONE_REGEX).required(),
  summary: Joi.string().trim().min(10).max(200).required(),
  description: Joi.string().trim().min(20).max(2000).required(),
  // Danh mục môn do admin quản lý trong DB → membership được kiểm tra ở class.service.
  subject: Joi.string().trim().max(100).required(),
  studentGender: Joi.string()
    .valid(...GENDER_OPTIONS)
    .required(),
  studentCount: Joi.number().integer().min(1).max(20).required(),
  startDate: Joi.date().iso().required(),
  minutesPerSession: Joi.number().integer().min(60).max(180).required(),
  sessionsPerWeek: Joi.number().integer().min(1).max(7).required(),
  provinceCode: Joi.number().integer().required(),
  districtCode: Joi.number().integer().required(),
  locationLabel: Joi.string().trim().max(200).required(),
  availabilitySlots: Joi.array()
    .items(availabilitySlotSchema)
    .min(1)
    .required()
    .custom((slots, helpers) => {
      const seen = new Set();
      for (const slot of slots) {
        const key = `${slot.day}-${slot.hour}`;
        if (seen.has(key)) {
          return helpers.message({ custom: "Khung giờ bị trùng lặp" });
        }
        seen.add(key);
      }
      return slots;
    }),
  tutorGenderPref: Joi.string()
    .valid(...GENDER_OPTIONS, "any")
    .default("any"),
  tutorLevelPref: Joi.string()
    .valid(...TUTOR_LEVEL_OPTIONS)
    .default("any"),
  promoCode: Joi.string().trim().max(50).allow("", null).optional(),
});

const quoteClassSchema = baseClassSchema;
const createClassSchema = baseClassSchema;
// Mời gia sư trực tiếp: như tạo lớp + bắt buộc id gia sư được mời (24 ký tự hex ObjectId)
const createInviteSchema = baseClassSchema.keys({
  requestedTutorId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Gia sư được mời không hợp lệ",
      "any.required": "Thiếu thông tin gia sư được mời",
    }),
});
// Sửa bài đăng: dùng lại toàn bộ field nhập như khi tạo (mã ưu đãi giữ nguyên, không sửa qua đây)
const updateClassSchema = baseClassSchema;

const listClassQuerySchema = Joi.object({
  subject: Joi.string().trim().max(100).optional(),
  provinceCode: Joi.number().integer().optional(),
  districtCode: Joi.number().integer().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(6),
});

const classFeedQuerySchema = Joi.object({
  subject: Joi.string().trim().allow("").max(100).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

const applicationListQuerySchema = paginationQuerySchema.keys({
  status: Joi.string()
    .valid("all", ...Object.values(CLASS_APPLICATION_STATUS))
    .optional(),
});

// Gia sư hủy đơn nhận lớp — bắt buộc nêu lý do
const cancelApplicationSchema = Joi.object({
  reason: Joi.string().trim().min(5).max(500).required().messages({
    "string.empty": "Vui lòng nhập lý do hủy đơn",
    "string.min": "Lý do hủy phải có ít nhất 5 ký tự",
    "string.max": "Lý do hủy không được vượt quá 500 ký tự",
    "any.required": "Vui lòng nhập lý do hủy đơn",
  }),
});

// Gia sư từ chối lời mời — bắt buộc nêu lý do
const declineInvitationSchema = Joi.object({
  reason: Joi.string().trim().min(5).max(500).required().messages({
    "string.empty": "Vui lòng nhập lý do từ chối",
    "string.min": "Lý do từ chối phải có ít nhất 5 ký tự",
    "string.max": "Lý do từ chối không được vượt quá 500 ký tự",
    "any.required": "Vui lòng nhập lý do từ chối",
  }),
});

module.exports = {
  quoteClassSchema,
  createClassSchema,
  createInviteSchema,
  updateClassSchema,
  listClassQuerySchema,
  classFeedQuerySchema,
  paginationQuerySchema,
  applicationListQuerySchema,
  cancelApplicationSchema,
  declineInvitationSchema,
  validateBody,
  validateQuery,
};
