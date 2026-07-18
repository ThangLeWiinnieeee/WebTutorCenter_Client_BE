// Lỗi có chủ đích cho người dùng (kèm mã HTTP), phân biệt với lỗi hệ thống
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isUserError = true;
  }
}

module.exports = AppError;
