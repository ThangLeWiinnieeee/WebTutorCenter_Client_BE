const Joi = require("joi");
const { validateParams, validateQuery } = require("../middlewares/validate.middleware");

const provinceCodeParamsSchema = Joi.object({
  provinceCode: Joi.number().integer().positive().required(),
});

const schoolSearchQuerySchema = Joi.object({
  q: Joi.string().trim().allow("").max(100).default(""),
});

module.exports = {
  provinceCodeParamsSchema,
  schoolSearchQuerySchema,
  validateParams,
  validateQuery,
};
