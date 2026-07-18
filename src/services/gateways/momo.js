const crypto = require("crypto");
const axios = require("axios");
const AppError = require("../../utils/AppError");
const HTTP_STATUS = require("../../constants/status");

// Provider MoMo (sandbox). Tạo đơn = gọi API server-to-server lấy payUrl; ký/verify HMAC-SHA256.
// Đọc cấu hình MoMo từ biến môi trường
const cfg = () => ({
  endpoint: process.env.MOMO_ENDPOINT || "https://test-payment.momo.vn/v2/gateway/api/create",
  partnerCode: process.env.MOMO_PARTNER_CODE,
  accessKey: process.env.MOMO_ACCESS_KEY,
  secretKey: process.env.MOMO_SECRET_KEY,
});

// Ký HMAC-SHA256
const hmac256 = (data, key) =>
  crypto.createHmac("sha256", key).update(Buffer.from(data, "utf-8")).digest("hex");

// Kiểm tra đã cấu hình đủ credential MoMo chưa
const isConfigured = () => {
  const c = cfg();
  return Boolean(c.partnerCode && c.accessKey && c.secretKey);
};

// Gọi API MoMo tạo đơn và trả về payUrl
const createPaymentUrl = async ({ amount, txnRef, orderInfo, returnUrl, ipnUrl }) => {
  const { endpoint, partnerCode, accessKey, secretKey } = cfg();
  const requestId = txnRef;
  const orderId = txnRef;
  const requestType = "captureWallet";
  const extraData = "";
  // Thứ tự field trong rawSignature là CỐ ĐỊNH theo tài liệu MoMo (sắp xếp alphabet).
  const raw = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${returnUrl}&requestId=${requestId}&requestType=${requestType}`;
  const signature = hmac256(raw, secretKey);

  const body = {
    partnerCode,
    partnerName: "WebTutorCenter",
    storeId: "WebTutorCenter",
    requestId,
    amount: String(amount),
    orderId,
    orderInfo,
    redirectUrl: returnUrl,
    ipnUrl,
    lang: "vi",
    requestType,
    autoCapture: true,
    extraData,
    signature,
  };

  let res;
  try {
    res = await axios.post(endpoint, body, {
      timeout: 15000,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    throw new AppError("Không kết nối được cổng MoMo", HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
  if (!res.data || res.data.resultCode !== 0 || !res.data.payUrl) {
    throw new AppError(res.data?.message || "Tạo đơn thanh toán MoMo thất bại", HTTP_STATUS.BAD_REQUEST);
  }
  return res.data.payUrl;
};

// MoMo redirect kèm chữ ký trên các field kết quả — verify để chống giả mạo URL trả về.
const parseReturn = async (query) => {
  const { accessKey, secretKey } = cfg();
  const raw = `accessKey=${accessKey}&amount=${query.amount}&extraData=${query.extraData}&message=${query.message}&orderId=${query.orderId}&orderInfo=${query.orderInfo}&orderType=${query.orderType}&partnerCode=${query.partnerCode}&payType=${query.payType}&requestId=${query.requestId}&responseTime=${query.responseTime}&resultCode=${query.resultCode}&transId=${query.transId}`;
  const expected = hmac256(raw, secretKey);
  const valid = Boolean(query.signature) && expected === query.signature;
  return {
    txnRef: query.orderId,
    amount: Number(query.amount || 0),
    success: valid && String(query.resultCode) === "0",
    responseCode: String(query.resultCode ?? ""),
  };
};

module.exports = {
  key: "momo",
  label: "MoMo",
  isConfigured,
  makeTxnRef: (baseRef) => baseRef,
  createPaymentUrl,
  parseReturn,
};

// Self-check verify chữ ký return (offline): `node src/services/gateways/momo.js`
if (require.main === module) {
  const assert = require("assert");
  process.env.MOMO_ACCESS_KEY = "AK";
  process.env.MOMO_SECRET_KEY = "SK";
  process.env.MOMO_PARTNER_CODE = "PC";
  (async () => {
    const base = {
      amount: "720000",
      extraData: "",
      message: "Successful.",
      orderId: "order1",
      orderInfo: "phi nhan lop",
      orderType: "momo_wallet",
      partnerCode: "PC",
      payType: "qr",
      requestId: "order1",
      responseTime: "1700000000000",
      resultCode: "0",
      transId: "123",
    };
    const raw = `accessKey=AK&amount=${base.amount}&extraData=${base.extraData}&message=${base.message}&orderId=${base.orderId}&orderInfo=${base.orderInfo}&orderType=${base.orderType}&partnerCode=${base.partnerCode}&payType=${base.payType}&requestId=${base.requestId}&responseTime=${base.responseTime}&resultCode=${base.resultCode}&transId=${base.transId}`;
    const good = { ...base, signature: hmac256(raw, "SK") };
    assert.strictEqual((await parseReturn(good)).success, true, "chữ ký hợp lệ + resultCode 0 → success");
    assert.strictEqual((await parseReturn({ ...good, amount: "1" })).success, false, "sửa số tiền → fail");
    assert.strictEqual((await parseReturn({ ...good, resultCode: "1006" })).success, false, "resultCode lỗi → fail");
    assert.strictEqual((await parseReturn({ ...base, signature: "bad" })).success, false, "chữ ký sai → fail");
    console.log("momo self-check OK");
  })();
}
