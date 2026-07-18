const dns = require("dns");

// Ưu tiên DNS công cộng cho truy vấn SRV/TXT của MongoDB Atlas (tránh lỗi querySrv ECONNREFUSED);
// áp dụng ngay khi require, vẫn giữ DNS hệ thống làm dự phòng.
dns.setServers([...new Set(["8.8.8.8", "1.1.1.1", ...dns.getServers()])]);

module.exports = {};
