const crypto = require("crypto");

// Provider VNPay (sandbox). Interface chung: key/label/isConfigured/makeTxnRef/createPaymentUrl/parseReturn.
// Đọc cấu hình VNPay từ biến môi trường
const cfg = () => ({
  url: process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  tmnCode: process.env.VNP_TMN_CODE,
  hashSecret: process.env.VNP_HASH_SECRET,
});

// Sắp xếp tham số theo key + URL-encode đúng chuẩn ký của VNPay (space → "+").
const sortObject = (obj) => {
  const sorted = {};
  Object.keys(obj)
    .map((k) => encodeURIComponent(k))
    .sort()
    .forEach((k) => (sorted[k] = encodeURIComponent(obj[k]).replace(/%20/g, "+")));
  return sorted;
};

// Nối các cặp key=value (đã encode) — KHÔNG dùng querystring.stringify của Node (nó không nhận {encode:false}).
const toQueryString = (params) =>
  Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

// yyyyMMddHHmmss theo giờ VN (GMT+7).
const formatVnpDate = (date) => {
  const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const p = (n) => String(n).padStart(2, "0");
  return (
    vn.getUTCFullYear().toString() +
    p(vn.getUTCMonth() + 1) +
    p(vn.getUTCDate()) +
    p(vn.getUTCHours()) +
    p(vn.getUTCMinutes()) +
    p(vn.getUTCSeconds())
  );
};

// Ký HMAC-SHA512 chuỗi tham số
const sign = (params, secret) =>
  crypto.createHmac("sha512", secret).update(Buffer.from(toQueryString(params), "utf-8")).digest("hex");

// Kiểm tra đã cấu hình đủ credential VNPay chưa
const isConfigured = () => {
  const { tmnCode, hashSecret } = cfg();
  return Boolean(tmnCode && hashSecret);
};

// Tạo URL thanh toán VNPay (ký tham số rồi ghép query)
const createPaymentUrl = async ({ amount, txnRef, orderInfo, ipAddr, returnUrl }) => {
  const { url, tmnCode, hashSecret } = cfg();
  let params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Locale: "vn",
    vnp_CurrCode: "VND",
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: "other",
    vnp_Amount: amount * 100, // VNPay tính đơn vị x100
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: formatVnpDate(new Date()),
  };
  params = sortObject(params);
  params.vnp_SecureHash = sign(params, hashSecret);
  return `${url}?${toQueryString(params)}`;
};

// Chuẩn hóa kết quả VNPay trả về (query đã được Express URL-decode) về shape chung.
const parseReturn = async (query) => {
  const { hashSecret } = cfg();
  const params = { ...query };
  const secureHash = params.vnp_SecureHash;
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;
  const valid = Boolean(secureHash) && secureHash === sign(sortObject(params), hashSecret);
  return {
    txnRef: query.vnp_TxnRef,
    amount: Number(query.vnp_Amount || 0) / 100, // về VND thường để đối chiếu
    success: valid && query.vnp_ResponseCode === "00" && query.vnp_TransactionStatus === "00",
    responseCode: query.vnp_ResponseCode,
  };
};

module.exports = {
  key: "vnpay",
  label: "VNPay",
  isConfigured,
  makeTxnRef: (baseRef) => baseRef,
  createPaymentUrl,
  parseReturn,
};

// Self-check chữ ký (money/security path): `node src/services/gateways/vnpay.js`
if (require.main === module) {
  const assert = require("assert");
  process.env.VNP_TMN_CODE = "TESTCODE";
  process.env.VNP_HASH_SECRET = "SECRETKEY123";
  (async () => {
    const url = await createPaymentUrl({
      amount: 720000,
      txnRef: "abc123",
      orderInfo: "Thanh toan phi nhan lop 12345",
      ipAddr: "127.0.0.1",
      returnUrl: "http://localhost:5002/api/payments/vnpay/return",
    });
    assert.ok(url.includes("vnp_Amount=72000000"), "URL phải điền sẵn số tiền x100");

    // VNPay ký LẠI toàn bộ tham số khi redirect về (kèm ResponseCode/TransactionStatus) — dựng đúng vậy.
    const makeReturn = (over = {}) => {
      const p = {
        vnp_Amount: "72000000",
        vnp_ResponseCode: "00",
        vnp_TransactionStatus: "00",
        vnp_TxnRef: "abc123",
        vnp_TmnCode: "TESTCODE",
        vnp_OrderInfo: "Thanh toan phi nhan lop 12345",
        ...over,
      };
      p.vnp_SecureHash = sign(sortObject(p), cfg().hashSecret);
      return p;
    };
    assert.strictEqual((await parseReturn(makeReturn())).success, true, "chữ ký hợp lệ + code 00 → success");
    assert.strictEqual((await parseReturn({ ...makeReturn(), vnp_Amount: "1" })).success, false, "sửa số tiền sau khi ký → fail");
    assert.strictEqual((await parseReturn(makeReturn({ vnp_ResponseCode: "24", vnp_TransactionStatus: "02" }))).success, false, "code 24 → fail");
    assert.strictEqual((await parseReturn({ ...makeReturn(), vnp_SecureHash: "bad" })).success, false, "chữ ký sai → fail");
    console.log("vnpay self-check OK");
  })();
}
