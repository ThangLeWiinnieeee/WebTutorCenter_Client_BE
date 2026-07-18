const AppError = require("./AppError");

// Lỗi người dùng (AppError) trả JSON trực tiếp; lỗi hệ thống đẩy qua error middleware
const handleError = (error, res, next) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  next(error);
};

module.exports = handleError;
