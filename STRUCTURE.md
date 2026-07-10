# Cấu trúc thư mục - Backend (WebTutorCenter_BE)

> **Stack:** Node.js, Express, MongoDB, Mongoose, JWT, Joi, bcryptjs, Nodemailer, Google Auth Library, Cloudinary, Multer, morgan, cookie-parser, axios (gọi service nội bộ), express-rate-limit.

## Tổng quan

```text
WebTutorCenter_BE/
├── server.js                         # Entry: dotenv, connectDB, preload locationCache, app.listen
├── app.js                            # Express app: CORS, morgan, JSON parser, cookieParser, /api, error handler
├── scripts/
│   ├── seedLocations.js              # Fetch provinces.open-api.vn và upsert Province/District vào MongoDB
│   ├── seedSchools.js                # Seed danh sách trường đại học/cao đẳng/học viện
│   └── seedDemoData.js              # Seed dữ liệu demo users và pending tutors
├── src/
│   ├── configs/
│   │   ├── chatbot.js                # Client axios gọi chatbot-service (từ serviceClient + .env)
│   │   ├── cloudinary.js             # Cloudinary config
│   │   ├── cors.js                   # CORS options dùng trong app.js
│   │   └── database.js               # Mongoose connection
│   ├── constants/
│   │   ├── accountType.js            # local | google
│   │   ├── message.js                # Message dùng chung
│   │   ├── otpType.js                # register | forgot_password
│   │   ├── role.js                   # user | tutor | admin
│   │   ├── status.js                 # HTTP status constants
│   │   └── tutor/
│   │       ├── index.js
│   │       ├── occupationStatus.js
│   │       ├── subject.js
│   │       └── tutor.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── tutor.controller.js
│   │   ├── location.controller.js
│   │   ├── notification.controller.js
│   │   ├── class.controller.js
│   │   └── chatbot.controller.js       # Proxy hỏi–đáp sang chatbot-service (chỉ gọi service, trả data)
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── user.service.js
│   │   ├── tutor.service.js          # Đăng ký/duyệt/từ chối gia sư + tạo notification
│   │   ├── location.service.js
│   │   ├── notification.service.js
│   │   ├── class.service.js
│   │   └── chatbot.service.js          # Gọi chatbot-service qua serviceClient (axios), timeout + lỗi→503
│   ├── mappers/
│   │   ├── user.mapper.js            # UserMapper.toDTO — chuyển User document → DTO
│   │   ├── tutor.mapper.js           # TutorMapper.toDTO/toDTOList — resolve tên tỉnh/huyện từ locationCache (RAM, không query)
│   │   ├── notification.mapper.js    # NotificationMapper.toDTO/toDTOList
│   │   └── class.mapper.js           # ClassMapper.toDTO/toDTOList
│   ├── repositories/
│   │   ├── user.repository.js
│   │   ├── tutor.repository.js
│   │   ├── location.repository.js
│   │   ├── notification.repository.js
│   │   ├── otp.repository.js
│   │   └── class.repository.js
│   ├── models/
│   │   ├── user.model.js
│   │   ├── tutor.model.js            # Tutor profile, currentArea, teachingAreas, availability
│   │   ├── location.model.js         # Province, District, School schemas
│   │   ├── notification.model.js     # Notification + TTL readAt 7 ngày
│   │   ├── otp.model.js
│   │   └── class.model.js            # Class profile, subject, pricing, availability
│   ├── validations/
│   │   ├── auth.validation.js
│   │   ├── user.validation.js
│   │   ├── tutor.validation.js
│   │   ├── class.validation.js
│   │   └── chatbot.validation.js       # Joi: message (bắt buộc), history, sessionId
│   ├── routes/
│   │   ├── index.js                  # Mount /auth, /users, /tutors, /locations, /notifications
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── tutor.routes.js
│   │   ├── location.routes.js
│   │   ├── notification.routes.js
│   │   ├── class.routes.js
│   │   └── chatbot.routes.js           # POST / : optional auth → validate → buildChatbotRequest → controller
│   ├── middlewares/
│   │   ├── auth.middleware.js         # Verify JWT, gắn req.user (+ .optional cho guest)
│   │   ├── chatbot.middleware.js      # buildChatbotRequest: bóc token + user → req.chatbotRequest
│   │   ├── error.middleware.js        # Xử lý lỗi tập trung
│   │   ├── rateLimit.middleware.js    # chatbotRateLimiter: giới hạn /api/chatbot theo IP (chống spam LLM), chỉ bật ở production
│   │   └── role.middleware.js         # authorize theo role
│   └── utils/
│       ├── AppError.js               # Lỗi nghiệp vụ/user-facing
│       ├── email.js                  # Gửi mail OTP
│       ├── hash.js                   # bcrypt hash/compare
│       ├── locationCache.js          # Cache tỉnh/huyện trong RAM (TTL 10'), bỏ N+1 resolve tên khu vực
│       ├── otp.js                    # Tạo OTP, expiry, cooldown
│       ├── serviceClient.js          # Client axios dùng chung gọi service nội bộ (chatbot, AI CCCD sau này)
│       ├── response.js              # successResponse/errorResponse
│       ├── token.js                  # JWT generate/verify
│       └── upload.js                 # Multer + Cloudinary avatar upload/delete
├── package.json
└── STRUCTURE.md
```

## Kiến trúc Layer

```text
src/
├── controllers/    # Nhận req/res, gọi service, trả successResponse()
├── services/       # Logic nghiệp vụ, throw AppError
├── mappers/        # Chuyển đổi DB document → DTO (UserMapper, TutorMapper, NotificationMapper, ClassMapper)
├── repositories/   # Truy vấn DB
├── models/         # Mongoose schema
├── validations/    # Joi schema cho request validation
├── routes/         # Khai báo endpoint và middleware
├── configs/        # Cấu hình hệ thống (DB, CORS, Cloudinary)
├── constants/      # Constants dùng chung + constants riêng module (tutor/)
├── middlewares/    # Middleware xác thực, phân quyền, xử lý lỗi
└── utils/          # Tiện ích dùng chung (hash, token, email, upload...)
```

## Module hiện tại

### `auth`

Xử lý đăng ký, xác thực OTP, đăng nhập local/Google, refresh token, logout và quên mật khẩu. Controller chỉ nhận/trả response, service xử lý nghiệp vụ và gọi `users`/`otp` repository.

### `users`

Quản lý user profile: lấy thông tin user hiện tại, cập nhật hồ sơ, upload avatar Cloudinary, cập nhật role khi admin duyệt gia sư.

### `tutors`

Quản lý hồ sơ gia sư:

- User đăng ký làm gia sư.
- User xem tutor profile của chính mình.
- Admin xem danh sách hồ sơ pending.
- Admin approve/reject hồ sơ.
- Khi register/approve/reject sẽ tạo notification tương ứng.

`teachingAreas` hiện lưu theo cấu trúc một tỉnh/thành và nhiều quận/huyện:

```js
{
  province: Number,
  districts: [Number]
}
```

`currentArea` là khu vực sống hiện tại:

```js
{
  province: Number,
  district: Number
}
```

### `locations`

Lưu và đọc dữ liệu tỉnh/thành, quận/huyện từ MongoDB. Dữ liệu được seed từ `provinces.open-api.vn` bằng `scripts/seedLocations.js`. Vì là dữ liệu tĩnh, tên tỉnh/huyện được resolve qua `utils/locationCache.js` (nạp toàn bộ vào RAM, TTL 10 phút) thay vì query DB theo từng mã — tránh N+1 ở danh sách gia sư/lớp. Cập nhật DB xong cache tự nạp lại trong ≤ TTL (hoặc gọi `invalidate()`).

### `notifications`

Lưu thông báo theo `userId` trong MongoDB. Notification có `read`, `readAt`; TTL index tự xóa thông báo đã đọc sau 7 ngày kể từ `readAt`.

### `otp`

Lưu OTP theo email/type/expiry, phục vụ đăng ký và quên mật khẩu.

### `classes`

Quản lý lớp học mới:
- Người dùng đăng tin lớp học mới.
- Hệ thống tính toán học phí dự kiến dựa trên môn học, thời lượng và số lượng học sinh.
- Lọc và tìm kiếm lớp học theo môn học, tỉnh/thành, quận/huyện.
- Xem chi tiết lớp học.

### `chatbot`

**Proxy** câu hỏi người dùng sang **chatbot-service** (FastAPI riêng, xem `../chatbot-service`); BE không tự xử lý hội thoại và không có model/DB riêng. Luồng: `chatbotRateLimiter → optional auth → validate → buildChatbotRequest (bóc token + user) → controller → chatbot.service` gọi `POST {CHATBOT_URL}/api/chat` bằng axios qua client dùng chung `utils/serviceClient.js` (tái dùng cho AI-service khác như quét CCCD). Có token → forward `Authorization: Bearer` + `user{id,role}` cho câu "của tôi"; gắn `X-Internal-Secret` khi cấu hình. Chatbot lỗi/tắt/timeout → `503`, không làm sập BE. Khác module `chat` (chat người dùng ↔ admin realtime qua Socket.IO).

## API Routes

**Base:** `/api`

### Auth - `/api/auth`

| Method | Endpoint | Middleware | Mô tả |
|---|---|---|---|
| POST | `/register` | validate | Đăng ký tài khoản, gửi OTP |
| POST | `/verify-otp` | validate | Xác thực OTP |
| POST | `/resend-otp` | validate | Gửi lại OTP |
| POST | `/google` | - | Đăng nhập Google |
| POST | `/login` | validate | Đăng nhập email/mật khẩu |
| POST | `/logout` | authenticate | Đăng xuất |
| POST | `/refresh-token` | - | Refresh access token từ cookie |
| POST | `/forgot-password` | validate | Gửi OTP quên mật khẩu |
| POST | `/verify-forgot-password-otp` | validate | Xác thực OTP quên mật khẩu |
| POST | `/reset-password` | validate | Đặt lại mật khẩu |

### Users - `/api/users`

| Method | Endpoint | Middleware | Mô tả |
|---|---|---|---|
| GET | `/user-info` | authenticate | Lấy user hiện tại |
| PATCH | `/update-profile` | authenticate, validate | Cập nhật profile |
| POST | `/upload-avatar` | authenticate, uploadAvatarMiddleware | Upload avatar |

### Tutors - `/api/tutors`

| Method | Endpoint | Middleware | Mô tả |
|---|---|---|---|
| POST | `/register` | authenticate, validate | Đăng ký làm gia sư |
| GET | `/profile` | authenticate | Lấy hồ sơ gia sư của user hiện tại |
| GET | `/admin/pending` | authenticate, authorize admin | Admin lấy hồ sơ đang chờ duyệt |
| PATCH | `/admin/:id/approve` | authenticate, authorize admin | Admin duyệt hồ sơ, đổi role user thành tutor |
| PATCH | `/admin/:id/reject` | authenticate, authorize admin, validate | Admin từ chối hồ sơ |

### Locations - `/api/locations`

| Method | Endpoint | Middleware | Mô tả |
|---|---|---|---|
| GET | `/provinces` | - | Lấy danh sách tỉnh/thành |
| GET | `/provinces/:provinceCode/districts` | - | Lấy quận/huyện theo tỉnh/thành |

### Notifications - `/api/notifications`

| Method | Endpoint | Middleware | Mô tả |
|---|---|---|---|
| GET | `/` | authenticate | Lấy thông báo của user hiện tại |
| PATCH | `/:id/read` | authenticate | Đánh dấu một thông báo đã đọc |
| PATCH | `/read-all` | authenticate | Đánh dấu tất cả thông báo đã đọc |

### Classes - `/api/classes`

| Method | Endpoint | Middleware | Mô tả |
|---|---|---|---|
| POST | `/quote` | authenticate, validate | Tính học phí dự kiến |
| POST | `/` | authenticate, validate | Đăng lớp học mới |
| GET | `/` | validate | Lấy danh sách lớp học |
| GET | `/subjects` | - | Lấy danh sách môn học |
| GET | `/:id` | - | Lấy chi tiết lớp học |

### Chatbot - `/api/chatbot`

| Method | Endpoint | Middleware | Mô tả |
|---|---|---|---|
| POST | `/` | chatbotRateLimiter, optional auth, validate, buildChatbotRequest | Proxy hỏi–đáp sang chatbot-service; forward JWT (nếu có) cho câu "của tôi". Rate limit mặc định 20 req/60s/IP → 429 |

## Luồng xử lý chuẩn

```text
Request
  -> app.js middleware
  -> src/routes/index.js
  -> <module>.routes.js
  -> auth/role/validate middleware
  -> <module>.controller.js
  -> <module>.service.js
  -> <module>.mapper.js (DB document → DTO)
  -> <module>.repository.js
  -> MongoDB/Mongoose
```

## Quy ước file theo layer

```text
controllers/<module>.controller.js     # Nhận req/res, gọi service, trả successResponse()
routes/<module>.routes.js              # Khai báo endpoint và middleware
services/<module>.service.js           # Logic nghiệp vụ, throw AppError
mappers/<module>.mapper.js             # Chuyển đổi DB document → DTO
repositories/<module>.repository.js    # Truy vấn DB
models/<module>.model.js               # Mongoose schema nếu module có collection
validations/<module>.validation.js     # Joi schema nếu có request cần validate
```

## Biến môi trường

| Biến | Mô tả |
|---|---|
| `PORT` | Port backend |
| `NODE_ENV` | Môi trường chạy |
| `MONGODB_URI` | MongoDB connection string |
| `CLIENT_URL` | Frontend origin cho CORS |
| `ACCESS_TOKEN_SECRET` | Secret access token |
| `ACCESS_TOKEN_EXPIRES_IN` | Thời hạn access token |
| `REFRESH_TOKEN_SECRET` | Secret refresh token |
| `REFRESH_TOKEN_EXPIRES_IN` | Thời hạn refresh token |
| `GMAIL_USER` | Gmail gửi OTP |
| `GMAIL_PASS` | App password Gmail |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `CHATBOT_URL` | Gốc chatbot-service (mặc định `http://localhost:8001`) |
| `CHATBOT_INTERNAL_SECRET` | Secret nội bộ BE ↔ chatbot; phải trùng `INTERNAL_SECRET` của chatbot-service |
| `CHATBOT_TIMEOUT_MS` | Timeout khi gọi chatbot (mặc định `20000`) |
| `CHATBOT_RATE_MAX` / `CHATBOT_RATE_WINDOW_MS` | Rate limit `/api/chatbot` theo IP (mặc định 20 req / 60s) |
