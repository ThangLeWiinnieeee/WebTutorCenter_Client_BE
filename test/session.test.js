// Test luồng phiên đăng nhập nhiều thiết bị + đổi mật khẩu.
// Chạy: npm test  (cần .env trỏ tới DB thật; test tự tạo và tự xoá user tạm)
require("dotenv").config();
require("../src/configs/dns"); // DNS hệ thống từ chối truy vấn SRV của Atlas nếu không có

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const User = require("../src/models/user.model");
const repo = require("../src/repositories/user.repository");
const userService = require("../src/services/user.service");
const authService = require("../src/services/auth.service");
const { hashPassword } = require("../src/utils/hash");
const { describeDevice } = require("../src/utils/device");

const OLD_PASSWORD = "Old@pass1234";
let userId;

test.before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await repo.create({
    fullName: "Session Test",
    email: `sesstest_${Date.now()}@example.com`,
    password: await hashPassword(OLD_PASSWORD),
    type: "local",
    isVerified: true,
  });
  userId = user._id;
});

test.after(async () => {
  if (userId) await User.findByIdAndDelete(userId);
  await mongoose.disconnect();
});

const seedThreeDevices = async () => {
  await repo.removeSessions(userId);
  await repo.addSession(userId, { token: "T-phone", deviceName: "Pixel 7", deviceType: "phone" });
  await repo.addSession(userId, { token: "T-laptop", deviceName: "Chrome trên Windows", deviceType: "desktop" });
  await repo.addSession(userId, { token: "T-tablet", deviceName: "Safari trên iOS", deviceType: "tablet" });
};

test("nhiều thiết bị cùng đăng nhập, máy hiện tại được đánh dấu và xếp đầu", async () => {
  await seedThreeDevices();
  const sessions = await userService.listSessions(userId, "T-phone");

  assert.strictEqual(sessions.length, 3);
  assert.strictEqual(sessions[0].isCurrent, true);
  assert.strictEqual(sessions[0].deviceName, "Pixel 7");
  assert.strictEqual(sessions.filter((s) => s.isCurrent).length, 1);
});

test("thu hồi 1 phiên chỉ đá đúng thiết bị đó", async () => {
  await seedThreeDevices();
  const laptop = (await userService.listSessions(userId)).find((s) => s.deviceType === "desktop");

  await userService.revokeSession(userId, laptop.id);

  const left = await userService.listSessions(userId, "T-phone");
  assert.strictEqual(left.length, 2);
  assert.ok(!left.some((s) => s.deviceType === "desktop"));
  // Thiết bị bị thu hồi mất khả năng gia hạn, máy khác vẫn gia hạn được
  assert.strictEqual(await repo.findBySessionToken("T-laptop"), null);
  assert.ok(await repo.findBySessionToken("T-phone"));
});

test("thu hồi phiên không tồn tại thì báo lỗi, không im lặng", async () => {
  await seedThreeDevices();
  await assert.rejects(() => userService.revokeSession(userId, new mongoose.Types.ObjectId()), {
    statusCode: 404,
  });
});

test("gia hạn token xoay tại chỗ, không đẻ thêm phiên ma", async () => {
  await seedThreeDevices();
  await repo.rotateSessionToken(userId, "T-phone", "T-phone-v2");

  const sessions = await userService.listSessions(userId, "T-phone-v2");
  assert.strictEqual(sessions.length, 3, "gia hạn không được tạo phiên mới");
  assert.strictEqual(sessions.find((s) => s.isCurrent).deviceName, "Pixel 7");
  assert.strictEqual(await repo.findBySessionToken("T-phone"), null, "token cũ phải chết");
});

test("đăng xuất chỉ đóng phiên của máy đang gọi", async () => {
  await seedThreeDevices();
  await authService.logout(userId, "T-tablet");

  const left = await userService.listSessions(userId);
  assert.strictEqual(left.length, 2);
  assert.ok(!left.some((s) => s.deviceType === "tablet"));
});

test('đổi mật khẩu chọn "Không" thì các thiết bị khác vẫn đăng nhập', async () => {
  await seedThreeDevices();
  await userService.changePassword(userId, {
    currentPassword: OLD_PASSWORD,
    newPassword: "New@pass1234",
    revokeOtherSessions: false,
  });

  assert.strictEqual((await repo.findSessions(userId)).length, 3);
  // trả lại mật khẩu cũ cho các test sau
  await userService.changePassword(userId, {
    currentPassword: "New@pass1234",
    newPassword: OLD_PASSWORD,
    revokeOtherSessions: false,
  });
});

test('đổi mật khẩu chọn "Có" thì sạch phiên trên mọi thiết bị', async () => {
  await seedThreeDevices();
  await userService.changePassword(userId, {
    currentPassword: OLD_PASSWORD,
    newPassword: "New@pass1234",
    revokeOtherSessions: true,
  });

  assert.strictEqual((await repo.findSessions(userId)).length, 0);
  await userService.changePassword(userId, {
    currentPassword: "New@pass1234",
    newPassword: OLD_PASSWORD,
    revokeOtherSessions: false,
  });
});

test("sai mật khẩu hiện tại thì không đổi được", async () => {
  await assert.rejects(
    () =>
      userService.changePassword(userId, {
        currentPassword: "SaiHoanToan@1",
        newPassword: "Khac@pass1234",
      }),
    { statusCode: 400 }
  );
});

test("mật khẩu mới trùng mật khẩu cũ thì bị chặn", async () => {
  await assert.rejects(
    () =>
      userService.changePassword(userId, {
        currentPassword: OLD_PASSWORD,
        newPassword: OLD_PASSWORD,
      }),
    { statusCode: 400 }
  );
});

test("nhận diện thiết bị từ User-Agent và header app", () => {
  const req = (ua, headers = {}) => ({
    get: (k) => ({ "user-agent": ua, ...headers })[k.toLowerCase()],
  });

  assert.deepStrictEqual(
    describeDevice(req("Mozilla/5.0 (Windows NT 10.0; Win64) AppleWebKit/537.36 Chrome/120 Safari/537.36")),
    { deviceName: "Chrome trên Windows", deviceType: "desktop" }
  );
  // Edge phải được nhận trước Chrome vì UA của Edge cũng chứa "Chrome"
  assert.strictEqual(
    describeDevice(req("Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537.36 Edg/120")).deviceName,
    "Edge trên Windows"
  );
  assert.strictEqual(describeDevice(req("Mozilla/5.0 (iPad; CPU OS 17_0) Safari/604")).deviceType, "tablet");
  assert.deepStrictEqual(
    describeDevice(req("okhttp/4.9", { "x-client-platform": "mobile", "x-device-name": "Pixel 7" })),
    { deviceName: "Pixel 7", deviceType: "phone" }
  );
});

test("tên máy có dấu tiếng Việt về đúng chữ, không thành mojibake", () => {
  const req = (headers) => ({ get: (k) => headers[k.toLowerCase()] });
  const ten = "iPhone của Thắng";

  // Header HTTP chỉ chở latin-1 → client bắt buộc percent-encode
  const encoded = encodeURIComponent(ten);
  assert.strictEqual(
    describeDevice(req({ "x-client-platform": "mobile", "x-device-name": encoded, "user-agent": "" }))
      .deviceName,
    ten
  );

  // Client cũ gửi thẳng chuỗi chưa mã hoá thì vẫn không được crash
  assert.strictEqual(
    describeDevice(req({ "x-client-platform": "mobile", "x-device-name": "Pixel 7 100%", "user-agent": "" }))
      .deviceName,
    "Pixel 7 100%"
  );

  // Không gửi header thì rơi về nhãn mặc định
  assert.strictEqual(
    describeDevice(req({ "x-client-platform": "mobile", "user-agent": "" })).deviceName,
    "Ứng dụng di động"
  );
});
