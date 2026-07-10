const AppError = require("./AppError");

// Lỗi người dùng (AppError) trả JSON trực tiếp cho FE; lỗi hệ thống được đẩy qua
// error middleware để chỉ ghi log ở BE, không lộ chi tiết kỹ thuật ra phía người dùng.
const handleError = (error, res, next) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  next(error);
};

module.exports = handleError;
