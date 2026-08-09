const Joi = require("joi");
const { NOTIFICATION_AUDIENCE } = require("../constants/notification");

const audienceSchema = Joi.string().valid(...Object.values(NOTIFICATION_AUDIENCE));

const listNotificationsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  audience: audienceSchema,
});

const markAllNotificationsReadSchema = Joi.object({
  audience: audienceSchema,
});

module.exports = {
  listNotificationsQuerySchema,
  markAllNotificationsReadSchema,
};
