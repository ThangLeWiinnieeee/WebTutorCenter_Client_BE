// Registry các cổng thanh toán. Thêm cổng mới = tạo 1 file provider + đăng ký ở đây.
const vnpay = require("./vnpay");
const momo = require("./momo");
const zalopay = require("./zalopay");

const providers = { vnpay, momo, zalopay };

// Lấy provider thanh toán theo key
const getProvider = (key) => providers[key] || null;

// Danh sách cổng cho FE hiển thị: chỉ những cổng đã cấu hình credential mới cho chọn.
const listProviders = () =>
  Object.values(providers).map((p) => ({
    key: p.key,
    label: p.label,
    configured: p.isConfigured(),
  }));

module.exports = { getProvider, listProviders };
