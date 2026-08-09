const test = require("node:test");
const assert = require("node:assert/strict");
const { OAuth2Client } = require("google-auth-library");

process.env.ACCESS_TOKEN_SECRET ||= "test-access-secret-at-least-32-characters";
process.env.REFRESH_TOKEN_SECRET ||= "test-refresh-secret-at-least-32-characters";
process.env.GOOGLE_LOGIN_CLIENT_ID ||= "test-client.apps.googleusercontent.com";

const emailUtils = require("../src/utils/email");
let mailError;
let sentEmails = [];
emailUtils.sendForgotPasswordOtpEmail = async ({ to }) => {
  if (mailError) throw mailError;
  sentEmails.push(to);
};

const userRepository = require("../src/repositories/user.repository");
const otpRepository = require("../src/repositories/otp.repository");
const authService = require("../src/services/auth.service");
const ACCOUNT_TYPE = require("../src/constants/accountType");
const MESSAGE = require("../src/constants/message");

const getError = async (action) => {
  let caught;
  try {
    await action();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught);
  return { message: caught.message, statusCode: caught.statusCode };
};

test("password recovery không phân biệt email local, Google hoặc không tồn tại", async (t) => {
  const email = "person@example.com";
  const localUser = {
    _id: "local-id",
    email,
    fullName: "Local User",
    password: "$2a$12$hash",
    type: ACCOUNT_TYPE.LOCAL,
    isVerified: true,
    isActive: true,
    deletedAt: null,
  };
  let user = null;
  let otpDoc = null;
  let attempts = 1;

  t.mock.method(console, "error", () => {});
  t.mock.method(userRepository, "findByEmail", async () => user);
  t.mock.method(otpRepository, "findLatestActiveByEmailAndType", async () => otpDoc);
  t.mock.method(otpRepository, "create", async (data) => ({ _id: "otp-id", ...data }));
  t.mock.method(otpRepository, "incrementAttempts", async () => attempts);
  t.mock.method(otpRepository, "deleteById", async () => ({ deletedCount: 1 }));
  t.mock.method(otpRepository, "deleteByEmailAndType", async () => ({ deletedCount: 1 }));

  sentEmails = [];
  mailError = null;
  const unknownResult = await authService.forgotPassword({ email });

  user = { ...localUser, type: ACCOUNT_TYPE.GOOGLE, password: null };
  const googleResult = await authService.forgotPassword({ email });

  user = localUser;
  const localResult = await authService.forgotPassword({ email });

  mailError = new Error("mail unavailable");
  const mailFailureResult = await authService.forgotPassword({ email });

  assert.deepStrictEqual(unknownResult, googleResult);
  assert.deepStrictEqual(googleResult, localResult);
  assert.deepStrictEqual(localResult, mailFailureResult);
  assert.deepStrictEqual(sentEmails, [email]);

  user = null;
  otpDoc = null;
  const unknownError = await getError(() => authService.verifyForgotPasswordOtp({ email, otp: "111111" }));

  user = { ...localUser, type: ACCOUNT_TYPE.GOOGLE, password: null };
  const googleError = await getError(() => authService.verifyForgotPasswordOtp({ email, otp: "111111" }));

  user = localUser;
  const missingOtpError = await getError(() => authService.verifyForgotPasswordOtp({ email, otp: "111111" }));

  otpDoc = { _id: "otp-id", otp: "000000" };
  attempts = 5;
  const wrongOtpError = await getError(() => authService.verifyForgotPasswordOtp({ email, otp: "111111" }));

  assert.deepStrictEqual(unknownError, { message: MESSAGE.OTP_INVALID, statusCode: 400 });
  assert.deepStrictEqual(googleError, unknownError);
  assert.deepStrictEqual(missingOtpError, unknownError);
  assert.deepStrictEqual(wrongOtpError, unknownError);

  otpDoc = { _id: "otp-id", otp: "123456" };
  const result = await authService.verifyForgotPasswordOtp({ email, otp: "123456" });
  assert.equal(typeof result.resetToken, "string");
});

test("Google login từ chối email chưa verified và tạo tên fallback hợp lệ", async (t) => {
  let payload;
  let createdUser;
  let findCalls = 0;

  t.mock.method(OAuth2Client.prototype, "verifyIdToken", async () => ({ getPayload: () => payload }));
  t.mock.method(userRepository, "findByEmail", async () => {
    findCalls += 1;
    return null;
  });
  t.mock.method(userRepository, "create", async (data) => {
    createdUser = { _id: "google-id", role: "user", isActive: true, ...data };
    return createdUser;
  });
  t.mock.method(userRepository, "addSession", async () => ({}));

  payload = { email: "person@gmail.com", email_verified: false, name: "Person" };
  const unverifiedError = await getError(() => authService.googleLogin({ credential: "token" }));
  assert.deepStrictEqual(unverifiedError, { message: MESSAGE.GOOGLE_TOKEN_INVALID, statusCode: 401 });
  assert.equal(findCalls, 0);

  payload = { email: "A@GMAIL.COM", email_verified: true };
  const result = await authService.googleLogin({ credential: "token" });
  assert.equal(createdUser.email, "a@gmail.com");
  assert.equal(createdUser.fullName, "Người dùng Google");
  assert.equal(result.user.fullName, "Người dùng Google");
});
