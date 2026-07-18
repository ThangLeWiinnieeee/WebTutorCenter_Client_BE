const { verifyAccessToken } = require("../utils/token");
const { errorResponse } = require("../utils/response");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");

// Xác thực access token trong header và gắn thông tin người dùng vào req.user
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(res, {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        message: MESSAGE.TOKEN_MISSING,
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return errorResponse(res, {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      message: MESSAGE.TOKEN_INVALID,
    });
  }
};

// Xác thực token nếu có (không bắt buộc); token sai thì coi như khách
const optionalAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = verifyAccessToken(token);
      req.user = decoded;
    }
  } catch (error) {
    // Treat invalid token as guest
  }
  next();
};

authMiddleware.optional = optionalAuthMiddleware;

module.exports = authMiddleware;
