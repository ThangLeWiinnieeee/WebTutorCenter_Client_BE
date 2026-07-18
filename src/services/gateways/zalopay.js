const crypto = require("crypto");
const axios = require("axios");
const AppError = require("../../utils/AppError");
const HTTP_STATUS = require("../../constants/status");

// Provider ZaloPay (sandbox). Tạo đơn = gọi /v2/create lấy order_url; kết quả cuối lấy từ /v2/query
// (redirect của ZaloPay không đủ tin cậy) — hợp với localhost vì không cần callback công khai.
// Đọc cấu hình ZaloPay từ biến môi trường
const cfg = () => ({
  createEndpoint: process.env.ZALOPAY_CREATE_ENDPOINT || "https://sb-openapi.zalopay.vn/v2/create",
  queryEndpoint: process.env.ZALOPAY_QUERY_ENDPOINT || "https://sb-openapi.zalopay.vn/v2/query",
  appId: process.env.ZALOPAY_APP_ID,
  key1: process.env.ZALOPAY_KEY1,
  key2: process.env.ZALOPAY_KEY2,
});

// Ký HMAC-SHA256
const hmac256 = (data, key) =>
  crypto.createHmac("sha256", key).update(Buffer.from(data, "utf-8")).digest("hex");

// app_trans_id BẮT BUỘC bắt đầu bằng yyMMdd_ theo yêu cầu ZaloPay.
const yymmdd = (date) => {
  const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const p = (n) => String(n).padStart(2, "0");
  return String(vn.getUTCFullYear()).slice(2) + p(vn.getUTCMonth() + 1) + p(vn.getUTCDate());
};

// Kiểm tra đã cấu hình đủ credential ZaloPay chưa
const isConfigured = () => {
  const c = cfg();
  return Boolean(c.appId && c.key1 && c.key2);
};

// Gọi API ZaloPay tạo đơn và trả về order_url
const createPaymentUrl = async ({ amount, txnRef, orderInfo, returnUrl, ipnUrl }) => {
  const { createEndpoint, appId, key1 } = cfg();
  const appUser = "WebTutorCenter";
  const appTime = Date.now();
  const embedData = JSON.stringify({ redirecturl: returnUrl });
  const item = "[]";
  // mac = HMAC(app_id|app_trans_id|app_user|amount|app_time|embed_data|item, key1)
  const data = `${appId}|${txnRef}|${appUser}|${amount}|${appTime}|${embedData}|${item}`;
  const params = {
    app_id: Number(appId),
    app_trans_id: txnRef,
    app_user: appUser,
    app_time: appTime,
    item,
    embed_data: embedData,
    amount,
    description: orderInfo,
    bank_code: "",
    callback_url: ipnUrl,
    mac: hmac256(data, key1),
  };

  let res;
  try {
    res = await axios.post(createEndpoint, null, { params, timeout: 15000 });
  } catch {
    throw new AppError("Không kết nối được cổng ZaloPay", HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
  if (!res.data || res.data.return_code !== 1 || !res.data.order_url) {
    throw new AppError(res.data?.return_message || "Tạo đơn thanh toán ZaloPay thất bại", HTTP_STATUS.BAD_REQUEST);
  }
  return res.data.order_url;
};

// Redirect ZaloPay chỉ có ?apptransid&status → hỏi lại /v2/query để lấy kết quả chuẩn xác.
const parseReturn = async (query) => {
  const { queryEndpoint, appId, key1 } = cfg();
  const appTransId = query.apptransid || query.app_trans_id;
  if (!appTransId) return { txnRef: undefined, amount: 0, success: false, responseCode: "no_apptransid" };

  const mac = hmac256(`${appId}|${appTransId}|${key1}`, key1);
  let res;
  try {
    res = await axios.post(
      queryEndpoint,
      new URLSearchParams({ app_id: String(appId), app_trans_id: appTransId, mac }).toString(),
      { timeout: 15000, headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
  } catch {
    return { txnRef: appTransId, amount: 0, success: false, responseCode: "query_error" };
  }
  const rc = res.data?.return_code; // 1 = thành công, 2 = thất bại, 3 = đang xử lý
  return {
    txnRef: appTransId,
    amount: Number(res.data?.amount || 0),
    success: rc === 1,
    responseCode: String(rc ?? ""),
  };
};

module.exports = {
  key: "zalopay",
  label: "ZaloPay",
  isConfigured,
  makeTxnRef: (baseRef) => `${yymmdd(new Date())}_${baseRef}`,
  createPaymentUrl,
  parseReturn,
};

// Self-check định dạng txnRef + mac (không round-trip vì cần API sandbox): `node src/services/gateways/zalopay.js`
if (require.main === module) {
  const assert = require("assert");
  process.env.ZALOPAY_APP_ID = "2554";
  process.env.ZALOPAY_KEY1 = "K1";
  const ref = module.exports.makeTxnRef("abc123");
  assert.ok(/^\d{6}_abc123$/.test(ref), "txnRef phải dạng yyMMdd_<base>: " + ref);
  const m1 = hmac256("2554|" + ref + "|K1", "K1");
  const m2 = hmac256("2554|" + ref + "x|K1", "K1");
  assert.strictEqual(m1.length, 64, "mac phải 64 hex");
  assert.notStrictEqual(m1, m2, "mac phải đổi khi input đổi");
  console.log("zalopay self-check OK");
}
