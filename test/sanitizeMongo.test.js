// Test cho middleware chống NoSQL injection (sanitizeMongo).
// Chạy: npm test  (dùng node built-in test runner, không cần thư viện ngoài).
const { test } = require("node:test");
const assert = require("node:assert/strict");

const sanitizeMongo = require("../src/middlewares/sanitizeMongo.middleware");

// Helper: dựng req giả, chạy middleware, trả lại req + cờ đã gọi next().
const run = ({ body, query, params } = {}) => {
  const req = { body, query, params };
  let nextCalled = false;
  sanitizeMongo(req, {}, () => {
    nextCalled = true;
  });
  return { req, nextCalled };
};

test("gọi next() để request đi tiếp", () => {
  const { nextCalled } = run({ body: {} });
  assert.equal(nextCalled, true);
});

test("chặn login bypass: xoá toán tử $ne trong body", () => {
  // Kẻ tấn công gửi { email: {$ne: null}, password: {$ne: null} } để lấy user bất kỳ
  const { req } = run({ body: { email: { $ne: null }, password: { $ne: null } } });
  assert.deepEqual(req.body, { email: {}, password: {} });
});

test("xoá mọi key bắt đầu bằng $ ($gt, $where, $regex...)", () => {
  const { req } = run({
    body: { age: { $gt: 0 }, code: { $where: "1==1" }, name: { $regex: ".*" } },
  });
  assert.deepEqual(req.body, { age: {}, code: {}, name: {} });
});

test("xoá key chứa dấu chấm (truy cập field lồng nhau)", () => {
  const { req } = run({ body: { "user.role": "admin", ok: 1 } });
  assert.deepEqual(req.body, { ok: 1 });
});

test("KHÔNG đụng giá trị chuỗi chứa $ hoặc . (chỉ xử lý key)", () => {
  const { req } = run({ body: { price: "$100", domain: "a.b.com", note: "50$ hoặc hơn" } });
  assert.deepEqual(req.body, { price: "$100", domain: "a.b.com", note: "50$ hoặc hơn" });
});

test("đệ quy làm sạch object lồng nhau", () => {
  const { req } = run({ body: { filter: { nested: { $ne: 1 }, keep: "x" } } });
  assert.deepEqual(req.body, { filter: { nested: {}, keep: "x" } });
});

test("đệ quy làm sạch phần tử trong mảng", () => {
  const { req } = run({ body: { list: [{ $gt: "" }, { name: "x" }] } });
  assert.deepEqual(req.body, { list: [{}, { name: "x" }] });
});

test("làm sạch cả query và params, không chỉ body", () => {
  const { req } = run({
    query: { sort: { $where: "true" } },
    params: { id: { $ne: null } },
  });
  assert.deepEqual(req.query, { sort: {} });
  assert.deepEqual(req.params, { id: {} });
});

test("chặn prototype pollution qua __proto__ và không làm ô nhiễm Object", () => {
  // Payload thật phải qua JSON.parse để __proto__ là OWN property (viết literal sẽ set prototype thật)
  const body = JSON.parse('{"__proto__": {"isAdmin": true}, "a": {"constructor": 1}}');
  const { req } = run({ body });
  assert.equal({}.isAdmin, undefined, "Object.prototype không bị ô nhiễm");
  assert.equal("isAdmin" in req.body, false);
  assert.deepEqual(req.body.a, {});
});

test("không lỗi khi body/query/params undefined", () => {
  const { req, nextCalled } = run({});
  assert.equal(nextCalled, true);
  assert.equal(req.body, undefined);
});

test("giữ nguyên payload hợp lệ", () => {
  const clean = { email: "a@b.com", age: 20, tags: ["x", "y"], profile: { city: "HN" } };
  const { req } = run({ body: JSON.parse(JSON.stringify(clean)) });
  assert.deepEqual(req.body, clean);
});

test("từ chối payload lồng quá sâu (chống DoS tràn stack) qua next(err)", () => {
  let deep = {};
  for (let i = 0; i < 100; i++) deep = { a: deep };
  const req = { body: deep };
  let err;
  sanitizeMongo(req, {}, (e) => (err = e));
  assert.ok(err, "phải gọi next với lỗi");
  assert.equal(err.statusCode, 400);
});

test("payload lồng nông (trong ngưỡng) vẫn được làm sạch bình thường", () => {
  let nested = { $ne: 1 };
  for (let i = 0; i < 10; i++) nested = { a: nested };
  const { req } = run({ body: nested });
  // đi xuống đáy: mọi tầng .a rồi tới object cuối đã bị xoá $ne
  let cur = req.body;
  for (let i = 0; i < 10; i++) cur = cur.a;
  assert.deepEqual(cur, {});
});
