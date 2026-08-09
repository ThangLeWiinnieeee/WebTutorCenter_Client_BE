const Joi = require("joi");

const rejectClassApplicationSchema = Joi.object({
  rejectionReason: Joi.string().trim().min(5).max(500).required().messages({
    "string.empty": "Lý do từ chối không được để trống",
    "string.min": "Lý do từ chối phải có ít nhất 5 ký tự",
    "string.max": "Lý do từ chối không được vượt quá 500 ký tự",
    "any.required": "Lý do từ chối là bắt buộc",
  }),
});

const adminListClassApplicationsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  // "selected" = gia sư người đăng đã chọn, đang chờ admin duyệt (hàng chờ chính của admin)
  status: Joi.string()
    .valid("pending", "selected", "approved", "rejected", "all")
    .default("selected"),
  // origin: "apply" (gia sư tự ứng tuyển) | "invite" (gia sư được mời) — chia 2 mục duyệt
  origin: Joi.string().valid("apply", "invite").optional(),
});

const classApplicationStatsQuerySchema = Joi.object({
  origin: Joi.string().valid("apply", "invite").optional(),
});

module.exports = {
  rejectClassApplicationSchema,
  adminListClassApplicationsQuerySchema,
  classApplicationStatsQuerySchema,
};
