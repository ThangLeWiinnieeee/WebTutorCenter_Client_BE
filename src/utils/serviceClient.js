const axios = require("axios");
const AppError = require("./AppError");
const HTTP_STATUS = require("../constants/status");

// Tạo axios client gọi service nội bộ (gắn sẵn baseURL + timeout + secret; lỗi quy về AppError 503)
const createInternalClient = ({ baseURL, secret = "", timeout = 20000, serviceLabel = "Dịch vụ" }) => {
  const client = axios.create({
    baseURL: String(baseURL).replace(/\/+$/, ""),
    timeout,
  });
  if (secret) client.defaults.headers.common["X-Internal-Secret"] = secret;

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      // Log nguyên nhân gốc để chẩn đoán trên hosting (timeout / refused / 5xx);
      // FE vẫn chỉ nhận 503 chung, không lộ chi tiết nội bộ.
      const detail = err.response ? `HTTP ${err.response.status}` : err.code || err.message;
      console.error(`[serviceClient] ${serviceLabel} lỗi: ${detail}`);
      throw new AppError(
        `${serviceLabel} hiện không phản hồi, vui lòng thử lại sau.`,
        HTTP_STATUS.SERVICE_UNAVAILABLE
      );
    }
  );

  return client;
};

module.exports = { createInternalClient };

// Self-check (không cần server ngoài): node src/utils/serviceClient.js
if (require.main === module) {
  const assert = require("assert");
  (async () => {
    const c = createInternalClient({ baseURL: "http://x:1/", secret: "s3cr3t", timeout: 500, serviceLabel: "Test" });
    assert.strictEqual(c.defaults.baseURL, "http://x:1", "cắt dấu / cuối baseURL");
    assert.strictEqual(c.defaults.headers.common["X-Internal-Secret"], "s3cr3t", "gắn secret");

    try {
      await c.get("http://127.0.0.1:9/nope"); // cổng chắc chắn từ chối → lỗi mạng
      assert.fail("phải ném lỗi khi service không phản hồi");
    } catch (e) {
      assert.ok(e instanceof AppError && e.statusCode === 503, "lỗi mạng → AppError 503");
    }

    const c2 = createInternalClient({ baseURL: "http://x:1" });
    assert.ok(!c2.defaults.headers.common["X-Internal-Secret"], "không secret → không gắn header");

    console.log("serviceClient self-check OK");
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
