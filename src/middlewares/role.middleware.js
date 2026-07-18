const { errorResponse } = require("../utils/response");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");

// Chặn truy cập nếu vai trò người dùng không nằm trong danh sách cho phép
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        message: MESSAGE.TOKEN_MISSING,
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(res, {
        statusCode: HTTP_STATUS.FORBIDDEN,
        message: MESSAGE.FORBIDDEN,
      });
    }

    next();
  };
};

module.exports = roleMiddleware;
