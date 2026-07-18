const Joi = require("joi");
const { PAYMENT_PROVIDERS } = require("../constants/payment");
const { validateBody } = require("../middlewares/validate.middleware");

// Gia sư bấm thanh toán phí nhận lớp — cần id đơn nhận lớp + chọn cổng thanh toán.
const initiateClassFeeSchema = Joi.object({
  applicationId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Đơn nhận lớp không hợp lệ",
      "any.required": "Thiếu thông tin đơn nhận lớp",
    }),
  provider: Joi.string()
    .valid(...Object.values(PAYMENT_PROVIDERS))
    .required()
    .messages({
      "any.only": "Cổng thanh toán không hợp lệ",
      "any.required": "Vui lòng chọn cổng thanh toán",
    }),
});

module.exports = {
  initiateClassFeeSchema,
  validateBody,
};
