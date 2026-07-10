const authService = require("../services/auth.service");
const { successResponse } = require("../utils/response");
const { REFRESH_TOKEN_COOKIE_OPTIONS, REFRESH_TOKEN_CLEAR_OPTIONS } = require("../utils/token");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");

const handleError = require("../utils/handleError");

const register = async (req, res, next) => {
  try {
    const { email } = await authService.register(req.body);

    return successResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: MESSAGE.OTP_SENT,
      data: { email },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { accessToken, refreshToken, user } = await authService.verifyOtp(req.body);

    res.cookie("refreshToken", refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.OTP_VERIFY_SUCCESS,
      data: { accessToken, user },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const resendOtp = async (req, res, next) => {
  try {
    const { email } = await authService.resendOtp(req.body);

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.OTP_RESENT,
      data: { email },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const googleLogin = async (req, res, next) => {
  try {
    const { accessToken, refreshToken, user } = await authService.googleLogin(req.body);

    res.cookie("refreshToken", refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.GOOGLE_LOGIN_SUCCESS,
      data: { accessToken, user },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const login = async (req, res, next) => {
  try {
    const { accessToken, refreshToken, user } = await authService.login(req.body);

    res.cookie("refreshToken", refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.LOGIN_SUCCESS,
      data: { accessToken, user },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user.id);

    res.clearCookie("refreshToken", REFRESH_TOKEN_CLEAR_OPTIONS);

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.LOGOUT_SUCCESS,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    const { accessToken, refreshToken: newRefreshToken } = await authService.refreshToken(token);

    res.cookie("refreshToken", newRefreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.REFRESH_TOKEN_SUCCESS,
      data: { accessToken },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = await authService.forgotPassword(req.body);

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.FORGOT_PASSWORD_OTP_SENT,
      data: { email },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const verifyForgotPasswordOtp = async (req, res, next) => {
  try {
    const { resetToken } = await authService.verifyForgotPasswordOtp(req.body);

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.FORGOT_PASSWORD_OTP_VERIFY_SUCCESS,
      data: { resetToken },
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    await authService.resetPassword(req.body);

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.RESET_PASSWORD_SUCCESS,
    });
  } catch (error) {
    handleError(error, res, next);
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
