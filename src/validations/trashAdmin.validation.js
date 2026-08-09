const Joi = require("joi");
const TRASH_TYPES = require("../constants/trash");

const adminTrashListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

const trashTypeParamsSchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(TRASH_TYPES))
    .required(),
});

const trashItemParamsSchema = trashTypeParamsSchema.keys({
  id: Joi.string().pattern(/^[a-f\d]{24}$/i).required(),
});

module.exports = {
  adminTrashListQuerySchema,
  trashTypeParamsSchema,
  trashItemParamsSchema,
};
