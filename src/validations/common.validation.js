const Joi = require("joi");
const { validateParams } = require("../middlewares/validate.middleware");

const objectIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({
    "string.pattern.base": "Mã định danh không hợp lệ",
    "any.required": "Thiếu mã định danh",
  });

const objectIdParamsSchema = (...names) =>
  Joi.object(Object.fromEntries(names.map((name) => [name, objectIdSchema])));

const validateObjectIdParams = (...names) => validateParams(objectIdParamsSchema(...names));

module.exports = {
  objectIdSchema,
  objectIdParamsSchema,
  validateObjectIdParams,
};
