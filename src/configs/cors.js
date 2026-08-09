const AppError = require("../utils/AppError");
const HTTP_STATUS = require("../constants/status");

const isProduction = process.env.NODE_ENV === "production";
const configuredOrigins = process.env.CLIENT_URL?.trim();

if (isProduction && !configuredOrigins) {
  throw new Error("CLIENT_URL là bắt buộc khi NODE_ENV=production");
}

const normalizeOrigin = (value) => {
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`CLIENT_URL không hợp lệ: ${value}`);
  }
};

// Danh sách origin chính xác; tự bỏ path/dấu slash cuối để tránh cấu hình production sai lệch.
const allowedOrigins = (configuredOrigins || "http://localhost:4000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)
  .map(normalizeOrigin);

// Cho phép bản preview *.vercel.app; chỉ bật ngoài production (prod chỉ dùng allowlist)
const isVercelPreview = (origin) => {
  if (isProduction) return false;
  try {
    return new URL(origin).hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
};

// Kiểm tra origin có được phép gọi API không
const isAllowedOrigin = (origin) => {
  // Không có origin: request server-to-server, curl, health check của host → cho phép.
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (isVercelPreview(origin)) return true;
  return false;
};

// Cấu hình CORS cho API
const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    callback(new AppError("Origin không được phép", HTTP_STATUS.FORBIDDEN));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  // Cache preflight ở production để request Authorization không tốn thêm OPTIONS liên tục.
  maxAge: isProduction ? 600 : 0,
};

module.exports = corsOptions;
