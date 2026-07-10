const Joi = require("joi");
const { validate } = require("../middlewares/validate.middleware");

// Một lượt hội thoại trước đó (giúp AI hiểu ngữ cảnh nhiều lượt).
const historyItemSchema = Joi.object({
  role: Joi.string().valid("user", "assistant").required(),
  content: Joi.string().trim().min(1).max(2000).required(),
});

const askSchema = Joi.object({
  message: Joi.string().trim().min(1).max(1000).required().messages({
    "string.empty": "Vui lòng nhập nội dung câu hỏi",
    "string.min": "Vui lòng nhập nội dung câu hỏi",
    "string.max": "Câu hỏi không được vượt quá 1000 ký tự",
    "any.required": "Vui lòng nhập nội dung câu hỏi",
  }),
  history: Joi.array().items(historyItemSchema).max(20).default([]),
  sessionId: Joi.string().trim().max(100).optional(),
});

module.exports = { validate, askSchema };
