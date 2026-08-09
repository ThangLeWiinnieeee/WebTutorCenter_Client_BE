const Joi = require("joi");
const { validateBody } = require("../middlewares/validate.middleware");

const PHONE_PATTERN = /^[+\d][\d\s().-]{7,19}$/;

const optionalLink = Joi.string()
  .trim()
  .uri({ scheme: ["http", "https"] })
  .allow("")
  .optional()
  .messages({ "string.uri": "Đường dẫn liên hệ không hợp lệ" });

const updateFooterSchema = Joi.object({
  address: Joi.string().trim().required().messages({
    "string.empty": "Địa chỉ là bắt buộc",
    "any.required": "Địa chỉ là bắt buộc",
  }),
  phone: Joi.string().trim().pattern(PHONE_PATTERN).required().messages({
    "string.empty": "Số điện thoại là bắt buộc",
    "string.pattern.base": "Số điện thoại hotline không hợp lệ",
    "any.required": "Số điện thoại là bắt buộc",
  }),
  phone2: Joi.string().trim().pattern(PHONE_PATTERN).allow("").optional().messages({
    "string.pattern.base": "Số điện thoại hotline không hợp lệ",
  }),
  email: Joi.string().trim().email({ tlds: { allow: false } }).required().messages({
    "string.empty": "Email là bắt buộc",
    "string.email": "Email không hợp lệ",
    "any.required": "Email là bắt buộc",
  }),
  facebookLink: optionalLink,
  zaloLink: optionalLink,
  instagramLink: optionalLink,
  twitterLink: optionalLink,
  contractHtml: Joi.string().allow("").max(100000).optional().messages({
    "string.max": "Nội dung hợp đồng không được vượt quá 100.000 ký tự",
  }),
});

module.exports = {
  updateFooterSchema,
  validateBody,
};
