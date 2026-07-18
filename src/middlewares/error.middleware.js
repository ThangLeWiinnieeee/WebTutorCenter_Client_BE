const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");

// Middleware xử lý lỗi tập trung: lỗi người dùng trả message thật, lỗi hệ thống chỉ log ở BE
const errorMiddleware = (err, req, res, next) => {
  const isUserError = err.isUserError === true || (err.statusCode && err.statusCode < 500);

  if (isUserError) {
    return res.status(err.statusCode || HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    });
  }

  // Lỗi hệ thống → log đầy đủ ở terminal BE để dev điều tra.
  console.error(`[SYSTEM ERROR] ${req.method} ${req.originalUrl}`);
  console.error(err.stack || err);

  // FE chỉ nhận thông báo chung chung, không kèm message kỹ thuật hay stack trace.
  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: MESSAGE.INTERNAL_SERVER_ERROR,
  });
};

module.exports = errorMiddleware;
