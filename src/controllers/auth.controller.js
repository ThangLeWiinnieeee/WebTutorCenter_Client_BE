const authService = require("../services/auth.service");
const { successResponse } = require("../utils/response");
const {
  REFRESH_TOKEN_CLEAR_OPTIONS,
  sendRefreshToken,
  readRefreshToken,
} = require("../utils/token");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");
const { LOGIN_FREE_ATTEMPTS } = require("../middlewares/rateLimit.middleware");
const { describeDevice } = require("../utils/device");

// Đăng ký tài khoản mới và gửi OTP xác thực về email
const register = async (req, res, next) => {
  try {
    const { email } = await authService.register(req.body);

    return successResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: MESSAGE.OTP_SENT,
      data: { email },
    });
  } catch (error) {
    next(error);
  }
};

// Xác thực OTP đăng ký và cấp token đăng nhập
const verifyOtp = async (req, res, next) => {
  try {
    const { accessToken, refreshToken, user } = await authService.verifyOtp(
      req.body,
      describeDevice(req)
    );

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.OTP_VERIFY_SUCCESS,
      data: { accessToken, user, ...sendRefreshToken(req, res, refreshToken) },
    });
  } catch (error) {
    next(error);
  }
};

// Gửi lại mã OTP đăng ký
const resendOtp = async (req, res, next) => {
  try {
    const { email } = await authService.resendOtp(req.body);

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.OTP_RESENT,
      data: { email },
    });
  } catch (error) {
    next(error);
  }
};

// Đăng nhập bằng tài khoản Google
const googleLogin = async (req, res, next) => {
  try {
    const { accessToken, refreshToken, user } = await authService.googleLogin(
      req.body,
      describeDevice(req)
    );

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.GOOGLE_LOGIN_SUCCESS,
      data: { accessToken, user, ...sendRefreshToken(req, res, refreshToken) },
    });
  } catch (error) {
    next(error);
  }
};

// Đăng nhập bằng email/mật khẩu
const login = async (req, res, next) => {
  try {
    const { accessToken, refreshToken, user } = await authService.login(
      req.body,
      describeDevice(req)
    );

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.LOGIN_SUCCESS,
      data: { accessToken, user, ...sendRefreshToken(req, res, refreshToken) },
    });
  } catch (error) {
    // Sau LOGIN_FREE_ATTEMPTS lần sai mật khẩu, kèm số lượt còn lại vào thông báo
    // (req.rateLimit do loginRateLimiter đặt; chỉ đếm lần thất bại).
    const rl = req.rateLimit;
    if (
      rl &&
      rl.used > LOGIN_FREE_ATTEMPTS &&
      error?.message === MESSAGE.INVALID_CREDENTIALS
    ) {
      error.message = `${MESSAGE.INVALID_CREDENTIALS}. Bạn còn ${rl.remaining} lần thử.`;
    }
    next(error);
  }
};

// Đăng xuất và xoá refresh token
const logout = async (req, res, next) => {
  try {
    // Chỉ đóng phiên của thiết bị đang gọi — máy khác vẫn giữ đăng nhập.
    await authService.logout(req.user.id, readRefreshToken(req));

    res.clearCookie("refreshToken", REFRESH_TOKEN_CLEAR_OPTIONS);

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.LOGOUT_SUCCESS,
    });
  } catch (error) {
    next(error);
  }
};

// Cấp lại access token mới từ refresh token
const refreshToken = async (req, res, next) => {
  try {
    // Mobile gửi refresh token trong body, web nằm ở cookie httpOnly.
    const token = readRefreshToken(req);
    const { accessToken, refreshToken: newRefreshToken } = await authService.refreshToken(token);

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.REFRESH_TOKEN_SUCCESS,
      data: { accessToken, ...sendRefreshToken(req, res, newRefreshToken) },
    });
  } catch (error) {
    next(error);
  }
};

// Gửi OTP đặt lại mật khẩu về email khi quên mật khẩu
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = await authService.forgotPassword(req.body);

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.FORGOT_PASSWORD_OTP_SENT,
      data: { email },
    });
  } catch (error) {
    next(error);
  }
};

// Xác thực OTP quên mật khẩu và cấp reset token
const verifyForgotPasswordOtp = async (req, res, next) => {
  try {
    const { resetToken } = await authService.verifyForgotPasswordOtp(req.body);

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.FORGOT_PASSWORD_OTP_VERIFY_SUCCESS,
      data: { resetToken },
    });
  } catch (error) {
    next(error);
  }
};

// Đặt lại mật khẩu mới bằng reset token
const resetPassword = async (req, res, next) => {
  try {
    await authService.resetPassword(req.body);

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.RESET_PASSWORD_SUCCESS,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  verifyOtp,
  resendOtp,
  forgotPassword,
  verifyForgotPasswordOtp,
  resetPassword,
  login,
  googleLogin,
  logout,
  refreshToken,
};
