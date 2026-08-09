const AppError = require("../utils/AppError");
const HTTP_STATUS = require("../constants/status");

const requireUploadedFile = (message) => (req, res, next) => {
  if (!req.file) return next(new AppError(message, HTTP_STATUS.BAD_REQUEST));
  return next();
};

module.exports = { requireUploadedFile };
