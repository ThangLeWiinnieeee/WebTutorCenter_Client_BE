// Test escapeHtml — chống XSS/HTML-injection khi nhét dữ liệu người dùng vào HTML email.
const { test } = require("node:test");
const assert = require("node:assert/strict");

const { escapeHtml } = require("../src/utils/email");

test("vô hiệu hoá thẻ script/img độc hại", () => {
  assert.equal(
    escapeHtml('<img src=x onerror="alert(1)">'),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
  );
});

test("escape đủ 5 ký tự nhạy cảm & < > \" '", () => {
  assert.equal(escapeHtml(`&<>"'`), "&amp;&lt;&gt;&quot;&#39;");
});

test("giữ nguyên tên hợp lệ", () => {
  assert.equal(escapeHtml("Nguyễn Văn A"), "Nguyễn Văn A");
});

test("ép về chuỗi khi input không phải string", () => {
  assert.equal(escapeHtml(123), "123");
});
