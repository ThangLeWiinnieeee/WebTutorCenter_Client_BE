// Danh sách origin được phép (CLIENT_URL có thể chứa nhiều origin, cách nhau bằng dấu phẩy)
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:4000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const isProduction = process.env.NODE_ENV === "production";

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
    callback(new Error(`Origin không được phép bởi CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

module.exports = corsOptions;
