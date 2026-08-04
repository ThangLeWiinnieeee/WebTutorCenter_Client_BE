const userRepository = require("../repositories/user.repository");
const otpRepository = require("../repositories/otp.repository");
const pendingRegistrationRepository = require("../repositories/pendingRegistration.repository");
const { hashPassword, comparePassword } = require("../utils/hash");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateResetToken,
  verifyResetToken,
  isResetTokenCurrent,
} = require("../utils/token");
const {
  generateOtp,
  hashOtp,
  matchesOtp,
  getOtpExpiry,
  isResendTooSoon,
  getResendWaitSeconds,
  OTP_EXPIRES_MINUTES,
  MAX_OTP_ATTEMPTS,
} = require("../utils/otp");
const { sendOtpEmail, sendForgotPasswordOtpEmail } = require("../utils/email");
const { describeDevice } = require("../utils/device");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");
const ACCOUNT_TYPE = require("../constants/accountType");
const OTP_TYPE = require("../constants/otpType");
const ROLES = require("../constants/role");
const AppError = require("../utils/AppError");
const { UserMapper } = require("../mappers");
const { OAuth2Client } = require("google-auth-library");

// Client ID verify Google ID token phải trùng client ID FE dùng phát token;
// tách khỏi GOOGLE_CLIENT_ID (Gmail API), fallback về GOOGLE_CLIENT_ID cho cấu hình cũ.
const GOOGLE_LOGIN_CLIENT_ID = process.env.GOOGLE_LOGIN_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_LOGIN_CLIENT_ID);

// Cấp access token + refresh token và lưu refresh token cho người dùng
// `req` để ghi lại thiết bị nào mở phiên này (hiện trong màn "Phiên đăng nhập").
const _issueTokens = async (user, req) => {
  const payload = { id: user._id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  await userRepository.addSession(user._id, {
    token: refreshToken,
    ...(req ? describeDevice(req) : {}),
  });
  return { accessToken, refreshToken };
};

// Kiểm tra OTP nhập vào; sai thì đếm số lần, vượt MAX_OTP_ATTEMPTS thì vô hiệu OTP (chống brute-force).
const _assertAndConsumeOtp = async (otpDoc, otp, { email, type }) => {
  if (matchesOtp(otpDoc.otp, otp, { email, type })) {
    const result = await otpRepository.deleteById(otpDoc._id);
    if (result.deletedCount === 1) return;
    throw new AppError(MESSAGE.OTP_EXPIRED, HTTP_STATUS.BAD_REQUEST);
  }

  const attempts = await otpRepository.incrementAttempts(otpDoc._id);
  if (attempts >= MAX_OTP_ATTEMPTS) {
    await otpRepository.deleteByEmailAndType(email, type);
    throw new AppError(MESSAGE.OTP_TOO_MANY_ATTEMPTS, HTTP_STATUS.TOO_MANY_REQUESTS);
  }
  throw new AppError(MESSAGE.OTP_INVALID, HTTP_STATUS.BAD_REQUEST);
};

// Tạo OTP mới và gửi qua email (đăng ký hoặc quên mật khẩu)
const _createAndSendOtp = async ({ email, fullName, type }) => {
  const existingOtp = await otpRepository.findLatestActiveByEmailAndType(email, type);

  if (existingOtp && isResendTooSoon(existingOtp.createdAt)) {
    const waitSeconds = getResendWaitSeconds(existingOtp.createdAt);
    throw new AppError(`${MESSAGE.OTP_RESEND_TOO_SOON} (còn ${waitSeconds}s)`, 429);
  }

  const otp = generateOtp();
  const expiresAt = getOtpExpiry();

  const otpDoc = await otpRepository.create({
    email,
    otp: hashOtp(otp, { email, type }),
    type,
    expiresAt,
  });

  try {
    if (type === OTP_TYPE.FORGOT_PASSWORD) {
      await sendForgotPasswordOtpEmail({ to: email, fullName, otp, expiresInMinutes: OTP_EXPIRES_MINUTES });
    } else {
      await sendOtpEmail({ to: email, fullName, otp, expiresInMinutes: OTP_EXPIRES_MINUTES });
    }
  } catch (error) {
    await otpRepository.deleteById(otpDoc._id);
    throw error;
  }
};

// ─── REGISTER ───

// Đăng ký tài khoản mới: lưu tạm thông tin và gửi OTP xác thực
const register = async ({ fullName, email, password, phone, dateOfBirth }) => {
  const existingUser = await userRepository.findByEmail(email);

  if (existingUser) {
    if (existingUser.type === ACCOUNT_TYPE.GOOGLE) {
      throw new AppError(MESSAGE.EXISTING_ACCOUNT_GOOGLE, HTTP_STATUS.BAD_REQUEST);
    }
    if (existingUser.isVerified) {
      throw new AppError(MESSAGE.EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }
    // Tài khoản local chưa xác thực sót lại từ luồng cũ → xóa để giải phóng email,
    // dữ liệu đăng ký mới sẽ được lưu tạm và chỉ ghi vào DB sau khi xác thực OTP.
    await userRepository.hardDeleteUnverifiedLocal(existingUser._id);
  }

  const hashedPassword = await hashPassword(password);

  // Lưu tạm thông tin tài khoản (chưa ghi vào collection users).
  // Nếu mất mạng khi nhập OTP, không có gì được lưu vào DB → người dùng đăng ký lại bình thường.
  await pendingRegistrationRepository.upsert({
    fullName,
    email,
    password: hashedPassword,
    role: ROLES.USER,
    phone,
    dateOfBirth,
  });

  await _createAndSendOtp({ email, fullName, type: OTP_TYPE.REGISTER });

  return { email };
};

// ─── VERIFY OTP ───

// Xác thực OTP đăng ký: tạo tài khoản trong DB và cấp token
const verifyOtp = async ({ email, otp, type = OTP_TYPE.REGISTER }, req) => {
  // Đã có tài khoản đã xác thực với email này → không cho xác thực lại
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser && existingUser.isVerified) {
    throw new AppError(MESSAGE.OTP_ALREADY_VERIFIED, HTTP_STATUS.CONFLICT);
  }

  // Dữ liệu đăng ký được lưu tạm; nếu hết hạn hoặc không tồn tại thì yêu cầu đăng ký lại
  const pending = await pendingRegistrationRepository.findActiveByEmail(email);
  if (!pending) {
    throw new AppError(MESSAGE.REGISTRATION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  // findLatestActiveByEmailAndType đã lọc expiresAt > now nên không cần kiểm tra thêm
  const otpDoc = await otpRepository.findLatestActiveByEmailAndType(email, type);
  if (!otpDoc) {
    throw new AppError(MESSAGE.OTP_EXPIRED, HTTP_STATUS.BAD_REQUEST);
  }

  await _assertAndConsumeOtp(otpDoc, otp, { email, type });

  // OTP hợp lệ → giờ mới ghi tài khoản vào DB (đã kích hoạt sẵn)
  const user = await userRepository.create({
    fullName: pending.fullName,
    email: pending.email,
    password: pending.password,
    role: ROLES.USER,
    phone: pending.phone,
    dateOfBirth: pending.dateOfBirth,
    type: ACCOUNT_TYPE.LOCAL,
    isVerified: true,
    phoneActivated: true,
  });

  // Dọn dữ liệu tạm và OTP đã dùng
  await Promise.all([
    pendingRegistrationRepository.deleteByEmail(email),
    otpRepository.deleteByEmailAndType(email, type),
  ]);

  const { accessToken, refreshToken } = await _issueTokens(user, req);
  return { accessToken, refreshToken, user: UserMapper.toDTO(user) };
};

// ─── RESEND OTP ───

// Gửi lại mã OTP (đăng ký hoặc quên mật khẩu)
const resendOtp = async ({ email, type = OTP_TYPE.REGISTER }) => {
  if (type === OTP_TYPE.REGISTER) {
    // Dữ liệu đăng ký nằm ở bảng tạm, chưa có trong users
    const pending = await pendingRegistrationRepository.findActiveByEmail(email);
    if (!pending) {
      throw new AppError(MESSAGE.REGISTRATION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Gia hạn dữ liệu tạm để không bị TTL dọn trong lúc chờ nhập OTP mới
    await pendingRegistrationRepository.upsert({
      fullName: pending.fullName,
      email: pending.email,
      password: pending.password,
      role: ROLES.USER,
      phone: pending.phone,
      dateOfBirth: pending.dateOfBirth,
    });

    await _createAndSendOtp({ email, fullName: pending.fullName, type });
    return { email };
  }

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new AppError(MESSAGE.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  await _createAndSendOtp({ email, fullName: user.fullName, type });

  return { email };
};

// ─── FORGOT PASSWORD ───

// Gửi OTP đặt lại mật khẩu về email (không tiết lộ email có tồn tại hay không)
const forgotPassword = async ({ email }) => {
  const user = await userRepository.findByEmail(email);

  // Không tiết lộ email có tồn tại hay không (bảo mật)
  if (!user || !user.isVerified) return { email };

  // Chỉ cho phép đặt lại mật khẩu cho tài khoản sử dụng mật khẩu (local)
  if (user.type === ACCOUNT_TYPE.GOOGLE) {
    throw new AppError(MESSAGE.ACCOUNT_NOT_CHANGE_PASSWORD, HTTP_STATUS.BAD_REQUEST);
  }

  await _createAndSendOtp({ email, fullName: user.fullName, type: OTP_TYPE.FORGOT_PASSWORD });

  return { email };
};

// ─── VERIFY FORGOT PASSWORD OTP ───

// Xác thực OTP quên mật khẩu và cấp reset token
const verifyForgotPasswordOtp = async ({ email, otp }) => {
  const user = await userRepository.findByEmail(email, true);
  if (!user || !user.isVerified) {
    throw new AppError(MESSAGE.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  const otpDoc = await otpRepository.findLatestActiveByEmailAndType(email, OTP_TYPE.FORGOT_PASSWORD);
  if (!otpDoc) {
    throw new AppError(MESSAGE.OTP_EXPIRED, HTTP_STATUS.BAD_REQUEST);
  }

  await _assertAndConsumeOtp(otpDoc, otp, { email, type: OTP_TYPE.FORGOT_PASSWORD });

  // OTP hợp lệ → xóa và cấp resetToken
  await otpRepository.deleteByEmailAndType(email, OTP_TYPE.FORGOT_PASSWORD);

  const resetToken = generateResetToken({ id: user._id, email: user.email }, user.password);

  return { resetToken };
};

// ─── RESET PASSWORD ───

// Đặt lại mật khẩu mới bằng reset token
const resetPassword = async ({ resetToken, newPassword }) => {
  let decoded;
  try {
    decoded = verifyResetToken(resetToken);
  } catch {
    throw new AppError(MESSAGE.RESET_TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
  }

  const user = await userRepository.findById(decoded.id, true);
  if (!user) {
    throw new AppError(MESSAGE.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  if (typeof user.password !== "string" || !isResetTokenCurrent(decoded, user.password)) {
    throw new AppError(MESSAGE.RESET_TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
  }

  if (await comparePassword(newPassword, user.password)) {
    throw new AppError(MESSAGE.RESET_PASSWORD_SAME_AS_OLD, HTTP_STATUS.BAD_REQUEST);
  }

  const hashedPassword = await hashPassword(newPassword);
  const updated = await userRepository.resetPasswordIfCurrent(user._id, user.password, hashedPassword);
  if (!updated) {
    throw new AppError(MESSAGE.RESET_TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
  }
};

// ─── LOGIN ───

// Đăng nhập bằng email/mật khẩu và cấp token
const login = async ({ email, password }, req) => {
  const user = await userRepository.findByEmail(email, true);
  if (!user) {
    throw new AppError(MESSAGE.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
  }

  if (!user.isVerified) {
    throw new AppError(MESSAGE.EMAIL_NOT_VERIFIED, HTTP_STATUS.FORBIDDEN);
  }

  if (!user.isActive) {
    throw new AppError(MESSAGE.ACCOUNT_DEACTIVATED, HTTP_STATUS.FORBIDDEN);
  }

  // Tài khoản Google: không có hash mật khẩu — tránh gọi bcrypt (sẽ lỗi Illegal arguments: string, object)
  if (user.type === ACCOUNT_TYPE.GOOGLE) {
    throw new AppError(MESSAGE.EXISTING_ACCOUNT_GOOGLE, HTTP_STATUS.BAD_REQUEST);
  }

  if (typeof user.password !== "string" || !user.password) {
    throw new AppError(MESSAGE.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new AppError(MESSAGE.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
  }

  const { accessToken, refreshToken } = await _issueTokens(user, req);
  return { accessToken, refreshToken, user: UserMapper.toDTO(user) };
};

// ─── LOGOUT ───

// Đăng xuất: chỉ đóng phiên của THIẾT BỊ đang gọi, các máy khác vẫn đăng nhập.
// Không có token (cookie đã mất) thì đóng hết cho chắc — tránh phiên mồ côi không ai gỡ được.
const logout = async (userId, token) => {
  if (token) await userRepository.removeSessionByToken(userId, token);
  else await userRepository.removeSessions(userId);
};

// ─── REFRESH TOKEN ───

// Cấp lại access token mới từ refresh token hợp lệ
const refreshToken = async (token) => {
  if (!token) {
    throw new AppError(MESSAGE.REFRESH_TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
  }

  try {
    verifyRefreshToken(token);
  } catch {
    throw new AppError(MESSAGE.TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
  }

  // Token không còn trong phiên nào → phiên đã bị thu hồi từ thiết bị khác.
  const user = await userRepository.findBySessionToken(token);
  if (!user) {
    throw new AppError(MESSAGE.REFRESH_TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
  }

  // Xoay token TẠI CHỖ trong phiên hiện có — không mở phiên mới, nếu không mỗi lần
  // gia hạn lại đẻ thêm một dòng "thiết bị" giả trong danh sách.
  const payload = { id: user._id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);
  const rotated = await userRepository.rotateSessionToken(user._id, token, newRefreshToken);
  if (rotated.modifiedCount !== 1) {
    throw new AppError(MESSAGE.REFRESH_TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
  }

  return { accessToken, refreshToken: newRefreshToken };
};

// ─── GOOGLE LOGIN ───

// Đăng nhập/đăng ký bằng Google: xác thực credential và cấp token
const googleLogin = async ({ credential }, req) => {
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_LOGIN_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw new AppError(MESSAGE.GOOGLE_TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
  }

  const { email, name, picture } = payload || {};
  if (!email) {
    throw new AppError(MESSAGE.GOOGLE_TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
  }

  const existingUser = await userRepository.findByEmail(email);

  if (existingUser) {
    if (existingUser.type === ACCOUNT_TYPE.LOCAL) {
      throw new AppError(MESSAGE.EXISTING_ACCOUNT_LOCAL, HTTP_STATUS.BAD_REQUEST);
    }

    if (!existingUser.isActive) {
      throw new AppError(MESSAGE.ACCOUNT_DEACTIVATED, HTTP_STATUS.FORBIDDEN);
    }

    const { accessToken, refreshToken } = await _issueTokens(existingUser, req);
    return { accessToken, refreshToken, user: UserMapper.toDTO(existingUser) };
  }

  const newUser = await userRepository.create({
    fullName: name,
    email,
    avatar: picture,
    type: ACCOUNT_TYPE.GOOGLE,
    isVerified: true,
  });

  const { accessToken, refreshToken } = await _issueTokens(newUser, req);
  return { accessToken, refreshToken, user: UserMapper.toDTO(newUser) };
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
