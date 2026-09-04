const test = require("node:test");
const assert = require("node:assert/strict");

process.env.REFRESH_TOKEN_SECRET ||= "test-refresh-secret-at-least-32-characters";

const { generateOtp, hashOtp, matchesOtp } = require("../src/utils/otp");
const {
  generateRefreshToken,
  generateResetToken,
  verifyResetToken,
  isResetTokenCurrent,
} = require("../src/utils/token");
const { registerSchema } = require("../src/validations/auth.validation");
const User = require("../src/models/user.model");
const userRepository = require("../src/repositories/user.repository");

test("OTP dùng CSPRNG và chỉ lưu/so khớp HMAC", () => {
  const context = { email: "User@Example.com", type: "register" };

  for (let index = 0; index < 100; index += 1) {
    assert.match(generateOtp(), /^\d{6}$/);
  }

  const digest = hashOtp("012345", context);
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.notStrictEqual(digest, "012345");
  assert.strictEqual(matchesOtp(digest, "012345", context), true);
  assert.strictEqual(matchesOtp(digest, "012346", context), false);
  assert.strictEqual(matchesOtp("012345", "012345", context), true, "OTP TTL cũ vẫn dùng được");
});

test("reset token hết hiệu lực ngay khi password hash đổi", () => {
  const oldHash = "$2a$12$old-password-hash";
  const token = generateResetToken({ id: "user-id", email: "user@example.com" }, oldHash);
  const decoded = verifyResetToken(token);

  assert.strictEqual(isResetTokenCurrent(decoded, oldHash), true);
  assert.strictEqual(isResetTokenCurrent(decoded, "$2a$12$new-password-hash"), false);
});

test("mỗi refresh token có jti riêng để rotation không bị trùng trong cùng một giây", () => {
  const payload = { id: "user-id", email: "user@example.com", role: "user" };
  const first = generateRefreshToken(payload);
  const second = generateRefreshToken(payload);

  assert.notStrictEqual(first, second);
});

test("public registration loại bỏ role do client tự gửi", () => {
  const { error, value } = registerSchema.validate({
    fullName: "Nguyen Van A",
    email: "user@example.com",
    password: "SecurePass@1",
    confirmPassword: "SecurePass@1",
    role: "admin",
    phone: "0912345678",
    dateOfBirth: "2000-01-01",
  });

  assert.ifError(error);
  assert.strictEqual(value.role, undefined);
});

test("khóa tài khoản xóa sessions trong cùng update", async (t) => {
  const calls = [];
  t.mock.method(User, "findOneAndUpdate", (...args) => {
    calls.push(args);
    return Promise.resolve({});
  });

  await userRepository.updateStatus("user-id", false);
  assert.deepStrictEqual(calls[0][1], { isActive: false, sessions: [] });

  await userRepository.resetPasswordIfCurrent("user-id", "old-hash", "new-hash");
  assert.deepStrictEqual(calls[1][0], { _id: "user-id", password: "old-hash", deletedAt: null });
  assert.deepStrictEqual(calls[1][1], { password: "new-hash", sessions: [] });
});

test("refresh token không tìm hoặc xoay session của tài khoản bị khóa/xóa", async (t) => {
  let findFilter;
  let rotateFilter;
  t.mock.method(User, "findOne", (filter) => {
    findFilter = filter;
    return { select: () => Promise.resolve(null) };
  });
  t.mock.method(User, "updateOne", (filter) => {
    rotateFilter = filter;
    return Promise.resolve({ matchedCount: 0, modifiedCount: 0 });
  });

  await userRepository.findBySessionToken("refresh-token");
  await userRepository.rotateSessionToken("user-id", "old-token", "new-token");

  assert.deepStrictEqual(findFilter, {
    "sessions.token": "refresh-token",
    isActive: true,
    deletedAt: null,
  });
  assert.deepStrictEqual(rotateFilter, {
    _id: "user-id",
    "sessions.token": "old-token",
    isActive: true,
    deletedAt: null,
  });
});
