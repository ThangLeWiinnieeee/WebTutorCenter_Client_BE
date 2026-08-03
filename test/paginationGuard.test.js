// Test middleware paginationGuard: ép trần/sàn page & limit cho mọi route /api.
const { test } = require("node:test");
const assert = require("node:assert/strict");

const paginationGuard = require("../src/middlewares/paginationGuard.middleware");
const { MAX_LIMIT } = paginationGuard;

// Chạy middleware với query cho trước, trả về query đã bị mutate + cờ next().
const run = (query) => {
  const req = { query: { ...query } };
  let nextCalled = false;
  paginationGuard(req, {}, () => (nextCalled = true));
  return { query: req.query, nextCalled };
};

test("limit vượt trần bị ép về MAX_LIMIT", () => {
  const { query, nextCalled } = run({ limit: "1000000" });
  assert.equal(query.limit, String(MAX_LIMIT));
  assert.equal(nextCalled, true);
});

test("limit hợp lệ trong ngưỡng giữ nguyên", () => {
  assert.equal(run({ limit: "20" }).query.limit, "20");
});

test("limit không hợp lệ / < 1 bị xoá (rơi về default của endpoint)", () => {
  assert.equal("limit" in run({ limit: "abc" }).query, false);
  assert.equal("limit" in run({ limit: "0" }).query, false);
  assert.equal("limit" in run({ limit: "-5" }).query, false);
});

test("page < 1 hoặc rác bị xoá (rơi về default = 1)", () => {
  assert.equal("page" in run({ page: "0" }).query, false);
  assert.equal("page" in run({ page: "xyz" }).query, false);
  assert.equal(run({ page: "3" }).query.page, "3");
});

test("không có page/limit thì không đụng gì", () => {
  const { query } = run({ subject: "Toán" });
  assert.deepEqual(query, { subject: "Toán" });
});
