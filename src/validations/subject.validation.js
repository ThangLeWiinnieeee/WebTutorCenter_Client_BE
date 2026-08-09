const Joi = require("joi");
const { validate, validateQuery } = require("../middlewares/validate.middleware");

const subjectFields = {
  name: Joi.string().trim().min(1).max(100),
  order: Joi.number().integer().min(0),
};

const listSubjectsQuerySchema = Joi.object({
  keyword: Joi.string().trim().allow("").max(100).optional(),
});

const createSubjectSchema = Joi.object({
  name: subjectFields.name.required(),
  order: subjectFields.order.optional(),
});

const updateSubjectSchema = Joi.object({
  name: subjectFields.name.optional(),
  isActive: Joi.boolean().optional(),
  order: subjectFields.order.optional(),
}).min(1);

module.exports = {
  listSubjectsQuerySchema,
  createSubjectSchema,
  updateSubjectSchema,
  validate,
  validateQuery,
};
