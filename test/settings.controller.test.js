const test = require("node:test");
const assert = require("node:assert/strict");

const { sanitizeContractHtml } = require("../src/controllers/settings.controller");

test("sanitizeContractHtml chỉ giữ định dạng hợp đồng an toàn", () => {
  const html = sanitizeContractHtml(
    '<h2 style="text-align: center; color: red">Điều khoản</h2><script>alert(1)</script><img src=x onerror=alert(1)><p><strong>Nội dung</strong></p>'
  );

  assert.equal(
    html,
    '<h2 style="text-align:center">Điều khoản</h2><p><strong>Nội dung</strong></p>'
  );
});
