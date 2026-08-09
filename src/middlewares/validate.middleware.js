const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");

// Tạo middleware validate một nguồn dữ liệu (body/query) bằng Joi
const buildValidator = (source, message) => (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req[source], { abortEarly: false, convert: true });
  if (error) {
    return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
      success: false,
      message,
      errors: error.details.map((d) => d.message),
    });
  }
  req[source] = value;
  next();
};

// Validate body request
const validate = buildValidator("body", MESSAGE.VALIDATION_ERROR);
// Alias rõ nghĩa hơn cho body (một số module dùng tên này)
const validateBody = validate;
// Validate query string (bộ lọc/phân trang)
const validateQuery = buildValidator("query", MESSAGE.QUERY_VALIDATION_ERROR);
// Validate route params (id, code...).
const validateParams = buildValidator("params", MESSAGE.VALIDATION_ERROR);

module.exports = { validate, validateBody, validateQuery, validateParams };
