// Test middleware security headers (P2).
const { test } = require("node:test");
const assert = require("node:assert/strict");

const securityHeaders = require("../src/middlewares/securityHeaders.middleware");

const run = () => {
  const headers = {};
  const res = { setHeader: (k, v) => (headers[k] = v) };
  let nextCalled = false;
  securityHeaders({}, res, () => (nextCalled = true));
  return { headers, nextCalled };
};

test("đặt các header chống MIME-sniffing / clickjacking / rò rỉ referrer + gọi next()", () => {
  const { headers, nextCalled } = run();
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(headers["Referrer-Policy"], "no-referrer");
  assert.equal(nextCalled, true);
});
