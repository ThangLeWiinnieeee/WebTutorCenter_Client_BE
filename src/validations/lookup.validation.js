const Joi = require("joi");
const { LOOKUP_TYPES } = require("../constants/lookup");
const { validate, validateParams } = require("../middlewares/validate.middleware");

const lookupSchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(LOOKUP_TYPES))
    .required(),
  value: Joi.string().trim().min(1).max(100).required(),
  label: Joi.string().trim().min(1).max(200).required(),
  parentId: Joi.string().trim().allow("", null).max(100).optional(),
  order: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true),
});

const createLookupSchema = lookupSchema;
const createManyLookupsSchema = Joi.object({
  lookups: Joi.array().items(lookupSchema).min(1).max(500).required(),
});
const updateLookupSchema = Joi.object({
  type: Joi.string().valid(...Object.values(LOOKUP_TYPES)).optional(),
  value: Joi.string().trim().min(1).max(100).optional(),
  label: Joi.string().trim().min(1).max(200).optional(),
  parentId: Joi.string().trim().allow("", null).max(100).optional(),
  order: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

const lookupTypeParamsSchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(LOOKUP_TYPES))
    .required(),
});
const lookupProvinceParamsSchema = Joi.object({
  province: Joi.string().trim().min(1).max(100).required(),
});

module.exports = {
  createLookupSchema,
  createManyLookupsSchema,
  updateLookupSchema,
  lookupTypeParamsSchema,
  lookupProvinceParamsSchema,
  validate,
  validateParams,
};
