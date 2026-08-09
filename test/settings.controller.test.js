const test = require("node:test");
const assert = require("node:assert/strict");

const settingsRepository = require("../src/repositories/settings.repository");
const { updateFooterSchema } = require("../src/validations/settings.validation");
const {
  getFooterSettings,
  updateFooterSettings,
} = require("../src/services/settings.service");
const { sanitizeContractHtml, normalizeContractHtml } = require("../src/utils/contractHtml");

test("sanitizeContractHtml chỉ giữ định dạng hợp đồng an toàn", () => {
  const html = sanitizeContractHtml(
    '<h2 style="text-align: center; color: red">Điều khoản</h2><script>alert(1)</script><img src=x onerror=alert(1)><p><strong>Nội dung</strong></p>'
  );

  assert.equal(
    html,
    '<h2 style="text-align:center">Điều khoản</h2><p><strong>Nội dung</strong></p>'
  );
});

test("hợp đồng chỉ có thẻ rỗng được lưu thành chuỗi rỗng", () => {
  assert.equal(normalizeContractHtml("<p><br></p>"), "");
});

test("validation settings chuẩn hóa payload và từ chối hotline sai", () => {
  const valid = updateFooterSchema.validate({
    address: "  Đà Nẵng  ",
    phone: " 093 143 9203 ",
    email: " contact@webtutor.vn ",
    contractHtml: "",
  });
  const invalid = updateFooterSchema.validate({
    address: "Đà Nẵng",
    phone: "123",
    email: "contact@webtutor.vn",
  });

  assert.equal(valid.error, undefined);
  assert.equal(valid.value.address, "Đà Nẵng");
  assert.ok(invalid.error);
});

test("không tự tạo cấu hình mặc định khi database chưa có dữ liệu", async () => {
  const originalFindByKey = settingsRepository.findByKey;
  settingsRepository.findByKey = async () => null;

  try {
    assert.deepEqual(await getFooterSettings(), {});
  } finally {
    settingsRepository.findByKey = originalFindByKey;
  }
});

test("cho phép lưu hợp đồng rỗng", async () => {
  const originalFindByKey = settingsRepository.findByKey;
  const originalUpsertValue = settingsRepository.upsertValue;
  let savedValue;

  settingsRepository.findByKey = async () => ({ value: {} });
  settingsRepository.upsertValue = async (key, value) => {
    assert.equal(key, "footer");
    savedValue = value;
    return { value };
  };

  try {
    const result = await updateFooterSettings({
      address: "Đà Nẵng",
      phone: "093 143 9203",
      email: "contact@webtutor.vn",
      contractHtml: "",
    });

    assert.equal(savedValue.contractHtml, "");
    assert.equal(result.contractHtml, "");
  } finally {
    settingsRepository.findByKey = originalFindByKey;
    settingsRepository.upsertValue = originalUpsertValue;
  }
});
