const HTTP_STATUS = require("../constants/status");

// Trả về response thành công theo định dạng JSON chuẩn
const successResponse = (res, { statusCode = HTTP_STATUS.OK, message = "Success", data = null } = {}) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  return res.status(statusCode).json(response);
};

// Trả về response lỗi theo định dạng JSON chuẩn
const errorResponse = (res, { statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, message = "Error", errors = null } = {}) => {
  const response = { success: false, message };
  if (errors !== null) response.errors = errors;
  return res.status(statusCode).json(response);
};

module.exports = { successResponse, errorResponse };
