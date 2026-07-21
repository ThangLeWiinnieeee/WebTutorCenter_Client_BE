const Joi = require("joi");
const { PHONE_REGEX, GENDER_OPTIONS } = require("../constants/tutor");
const {
  PASSWORD_MIN_LENGTH,
  PASSWORD_COMPLEXITY_REGEX,
  PASSWORD_COMPLEXITY_MESSAGE,
} = require("../constants/password");
const { validate } = require("../middlewares/validate.middleware");

const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).required().messages({
    "string.empty": "Họ tên không được để trống",
    "string.min": "Họ tên phải có ít nhất 2 ký tự",
    "string.max": "Họ tên không được vượt quá 100 ký tự",
    "any.required": "Họ tên là bắt buộc",
  }),
  phone: Joi.string()
    .pattern(PHONE_REGEX)
    .required()
    .messages({
      "string.pattern.base": "Số điện thoại không hợp lệ (phải là số điện thoại Việt Nam 10 số)",
      "any.required": "Số điện thoại là bắt buộc",
      "string.empty": "Số điện thoại là bắt buộc",
    }),
  gender: Joi.string().valid(...GENDER_OPTIONS).allow(null, "").optional().messages({
    "any.only": "Giới tính không hợp lệ",
  }),
  dateOfBirth: Joi.date().max("now").required().messages({
    "date.base": "Ngày sinh không hợp lệ",
    "date.max": "Ngày sinh không được lớn hơn thời gian hiện tại",
    "any.required": "Ngày sinh là bắt buộc",
  }),
});

// Đổi mật khẩu khi ĐANG đăng nhập — dùng lại đúng bộ quy tắc độ mạnh của lúc đăng ký.
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "string.empty": "Vui lòng nhập mật khẩu hiện tại",
    "any.required": "Vui lòng nhập mật khẩu hiện tại",
  }),
  newPassword: Joi.string()
    .min(PASSWORD_MIN_LENGTH)
    .pattern(PASSWORD_COMPLEXITY_REGEX)
    .required()
    .messages({
      "string.empty": "Mật khẩu mới không được để trống",
      "string.min": `Mật khẩu mới phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`,
      "string.pattern.base": PASSWORD_COMPLEXITY_MESSAGE,
      "any.required": "Mật khẩu mới là bắt buộc",
    }),
  confirmPassword: Joi.string().valid(Joi.ref("newPassword")).required().messages({
    "string.empty": "Mật khẩu xác nhận không được để trống",
    "any.only": "Mật khẩu xác nhận không khớp",
    "any.required": "Mật khẩu xác nhận là bắt buộc",
  }),
  // Người dùng chọn có đăng xuất khỏi mọi thiết bị sau khi đổi hay không
  revokeOtherSessions: Joi.boolean().default(false),
});

module.exports = { updateProfileSchema, changePasswordSchema, validate };
