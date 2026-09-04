const isProduction = process.env.NODE_ENV === "production";

// Gắn các header bảo mật cơ bản cho API (chống MIME-sniffing, clickjacking, rò rỉ referrer; HSTS ở production)
const securityHeaders = (_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff"); // chặn browser đoán MIME (JSON -> HTML)
  res.setHeader("X-Frame-Options", "DENY"); // chống nhúng iframe (clickjacking)
  res.setHeader("Referrer-Policy", "no-referrer"); // không gửi URL nội bộ sang site khác
  res.setHeader("X-XSS-Protection", "0"); // tắt bộ lọc XSS legacy (khuyến nghị hiện đại)
  // API chứa dữ liệu phiên và thay đổi liên tục; không để browser/proxy lưu response người dùng.
  res.setHeader("Cache-Control", "private, no-store");
  if (isProduction) {
    // Ép HTTPS trong 180 ngày; chỉ ý nghĩa khi đã chạy HTTPS thật.
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=15552000; includeSubDomains",
    );
  }
  next();
};

module.exports = securityHeaders;
