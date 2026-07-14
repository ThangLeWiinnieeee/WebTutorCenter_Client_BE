const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const compression = require("compression");
const cookieParser = require("cookie-parser");

const routes = require("./src/routes/index");
const errorMiddleware = require("./src/middlewares/error.middleware");
const securityHeaders = require("./src/middlewares/securityHeaders.middleware");
const corsOptions = require("./src/configs/cors");

const app = express();

// Sau reverse proxy của hosting (Render/Vercel...), tin proxy đầu tiên để req.ip là IP thật
// của client — rate limit (theo IP) mới chính xác. Localhost không có proxy nên chỉ bật ở production.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Tắt ETag: response JSON từ API không dùng cache 304. Nếu bật, client có thể nhận 304
// với thân rỗng; axios coi 200-304 là thành công nhưng `response.data` rỗng -> lỗi parse / mất user.
app.set("etag", false);

app.use(securityHeaders);
app.use(cors(corsOptions));
// Nén response (gzip) — JSON API (danh sách gia sư/lớp) giảm ~70-80% băng thông.
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api", routes);

app.use(errorMiddleware);

module.exports = app;
