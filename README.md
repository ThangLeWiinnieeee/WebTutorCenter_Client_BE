# WebTutorCenter Backend

Backend API cho hệ thống quản lý trung tâm gia sư trực tuyến. Dự án dùng Express + MongoDB theo kiến trúc layer rõ ràng: `routes -> controller -> service -> mapper -> repository -> model`. Chat realtime giữa người dùng và admin chạy trên Socket.IO dùng chung HTTP server với Express.

## Tech Stack

- Node.js, Express 4
- MongoDB, Mongoose 8
- Socket.IO 4 (chat realtime, xác thực bằng access token)
- JWT access/refresh token
- Joi validation
- bcryptjs
- Nodemailer (Gmail)
- google-auth-library (đăng nhập Google)
- Cloudinary + Multer (+ multer-storage-cloudinary) — upload avatar, giấy tờ gia sư, ảnh chat
- cookie-parser, morgan, cors, dotenv
- axios (gọi các service nội bộ: chatbot, AI-service…)
- express-rate-limit (chống spam `/api/chatbot`)
- Cổng thanh toán sandbox: VNPay, MoMo, ZaloPay (thu phí nhận lớp của gia sư)

## Yêu Cầu

- Node.js
- MongoDB
- Gmail app password nếu dùng OTP email
- Cloudinary account nếu dùng upload avatar/giấy tờ/ảnh chat
- Google OAuth client nếu dùng đăng nhập Google

## Cài Đặt

```bash
npm install
```

Tạo file `.env` trong thư mục backend và điền các biến cần thiết cho server (PORT, NODE_ENV), MongoDB (`MONGODB_URI`/`MONGO_URI`), JWT, email, Google OAuth, Cloudinary, cổng thanh toán và CORS theo môi trường chạy của bạn. Xem `.env.example` để biết danh sách đầy đủ.

> Hạn refresh token khai báo bằng `REFRESH_TOKEN_TTL_DAYS` (số ngày, mặc định 30).
> Biến cũ `REFRESH_TOKEN_EXPIRES_IN` **không còn được đọc** — nhớ đổi trong `.env` khi kéo code về.

## Chạy Dự Án

```bash
# Development (nodemon)
npm run dev

# Production
npm start
```

Base API:

```text
http://localhost:<PORT>/api
```

`server.js` tạo một HTTP server dùng chung cho Express và Socket.IO (`initSocket`). Khi server khởi động: preload cache tỉnh/huyện vào RAM (`locationCache.ensureLoaded()`) để request danh sách đầu tiên không phải chờ, rồi `startClassLifecycleScheduler()` chạy job nền định kỳ (mỗi 15 phút) để đánh dấu `expired` cho các bài đăng đã tới giờ học mà chưa có gia sư nhận.

## Seed Dữ Liệu

Các module dữ liệu động (`locations`, `lookup`, `subject`...) đọc từ MongoDB. Chạy script seed tương ứng khi cần:

```bash
npm run seed:locations          # tỉnh/quận từ provinces.open-api.vn (idempotent, upsert)
npm run seed:schools            # danh sách trường
npm run seed:lookups            # danh mục động (subject, occupation_status, gender, ...)
npm run seed:pricing            # cấu hình tính học phí (class pricing)
npm run seed:users              # user demo
npm run seed:tutors             # tutor demo
npm run seed:tutor-demo         # tutor demo (bộ dữ liệu mở rộng)
npm run seed:classes            # bài đăng lớp demo
npm run seed:demo               # users + tutors
npm run seed:full               # toàn bộ bộ dữ liệu demo
npm run seed:update-tutor-fields  # backfill field thống kê cho tutor cũ
```

> ⚠️ Một số script seed dùng `MONGODB_URI`, vài script dùng `MONGO_URI`; một số seed cũ tham chiếu đường dẫn constants có thể đã thay đổi. Kiểm tra đường dẫn/biến môi trường trước khi chạy. `scripts/seedSubjects.js` đã có npm script `seed:subjects`. Các script chạy qua `-r ./scripts/_atlasDns.js` để fix DNS khi kết nối MongoDB Atlas.

## Cấu Trúc Chính

```text
src/
├── controllers/        # Nhận req/res, gọi service, trả successResponse()
├── services/           # Logic nghiệp vụ, throw AppError
├── mappers/            # Chuyển DB document → DTO (user, tutor, class, class.application,
│                       #   notification, promo, review, profileChangeRequest, conversation, message)
├── repositories/       # Truy vấn MongoDB/Mongoose
├── models/             # Mongoose schema
├── validations/        # Joi schema cho request validation
├── routes/             # Khai báo endpoint + middleware; index.js mount tất cả dưới /api
├── configs/            # database, cloudinary, cors, dns, socket (Socket.IO), chatbot (axios client)
├── constants/          # status, message, role, otpType, accountType, occupationStatus,
│                       #   tutor, password (quy tắc độ mạnh), payment
├── middlewares/        # auth (+ .optional), role, validate, error, chatbot (buildChatbotRequest),
│                       #   rateLimit, sanitizeMongo, paginationGuard, securityHeaders
└── utils/              # token, response, hash, email, otp, upload, pagination, device,
                        #   code, classLifecycle (scheduler), locationCache, search, serviceClient, AppError
```

**Middleware bảo mật áp cho mọi route `/api`** (`routes/index.js`):

- `sanitizeMongo` — xoá key chứa `$`/`.` khỏi input, chặn NoSQL injection.
- `paginationGuard` — ép trần/sàn cho `page`/`limit`, chặn client kéo cả collection
  bằng `?limit=999999`.
- `securityHeaders` — set header bảo mật ở tầng app.

**Cache tỉnh/huyện (`utils/locationCache.js`)**: dữ liệu tỉnh/huyện là tĩnh nên được nạp toàn bộ vào RAM (Map theo `code`) thay vì query MongoDB theo từng mã. Loại bỏ N+1 khi resolve tên khu vực ở `TutorMapper`, `profileChangeRequest.mapper` và `class.service` (danh sách gia sư/lớp: từ ~N query location/trang → 0). Tự làm mới bằng TTL (10 phút) — sau khi cập nhật DB, cache tự nạp lại data mới mà không cần restart; cần tức thì thì gọi `invalidate()`. Preload sẵn lúc server khởi động.

Submodule trong `classes`: `class.application.*` (ứng tuyển / chọn / hủy nhận lớp + lời mời dạy trực tiếp) và `class.pricing.*` (model + repository tính học phí, có cache). Module `otp` là nội bộ của auth (`otp.model`, `otp.repository`, `utils/otp`). `pendingRegistration` lưu đăng ký chờ xác thực OTP trước khi tạo user.

**Khu vực admin** được tách thành nhiều router/controller/service theo từng chức năng thay vì một module `admin` duy nhất: `userAdmin`, `classAdmin`, `trashAdmin`, `tutorAdmin`, `classApplicationAdmin`, `cancellationAdmin`, `reviewAdmin`, `profileChangeAdmin`, `paymentAdmin`, `statsAdmin`. Tất cả được gom lại trong `admin.routes.js` và mount dưới `/api/admin` (đã áp sẵn `authMiddleware` + `roleMiddleware("admin")`).

**Thanh toán** (`payment.*` + `services/gateways/`): gia sư trả phí nhận lớp qua cổng sandbox. Mỗi cổng (VNPay/MoMo/ZaloPay) là một adapter trong `gateways`, cùng interface tạo URL + xác thực chữ ký khi cổng gọi về. Tỉ lệ phí nằm ở đúng một chỗ — `CLASS_FEE_RATE` trong `constants/payment.js` (hiện **12%** học phí tháng đầu).

**Chat** gồm `chat.controller/service/validation`, model `conversation`/`message`, repository tương ứng và mapper `conversation`/`message`. Mỗi người dùng (gia sư hoặc học viên) có đúng một cuộc trò chuyện với admin (`findOrCreateByTutorUserId`).

**Chatbot** (`chatbot.controller/service/validation` + `middlewares/chatbot.middleware`) là **proxy** sang chatbot-service (FastAPI riêng), không có model/DB. Khác hẳn module `chat` ở trên (chat người dùng ↔ admin realtime).

## API Overview

Tất cả route mount dưới `/api` (`src/routes/index.js`): `auth`, `users`, `tutors`, `locations`, `notifications`, `classes`, `lookups`, `subjects`, `admin`, `settings`, `promos`, `reviews`, `chat`, `chatbot`, `payments`.

### Web và Mobile dùng chung API

App mobile (Expo/React Native) gọi **cùng bộ endpoint** với web. Access token giống hệt
nhau; chỉ **refresh token** khác ở kênh vận chuyển, vì hai nền tảng ràng buộc ngược nhau:

| | Refresh token đi đâu | Lý do |
|---|---|---|
| Web | Cookie `httpOnly` | JS của trang không đọc được → XSS không trộm được |
| Mobile | Trong body response | RN không có cookie jar bền; app tự lưu vào SecureStore |

App mobile khai báo mình bằng header `x-client-platform: mobile` ở **mọi** request.
Toàn bộ rẽ nhánh gói trong `utils/token.js` (`isMobileClient`, `sendRefreshToken`,
`readRefreshToken`) — service và route không cần biết client là gì.

### Auth — `/api/auth`

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/register` | Đăng ký + gửi OTP email (tạo pending registration) |
| POST | `/verify-otp` | Xác thực OTP, kích hoạt tài khoản |
| POST | `/resend-otp` | Gửi lại OTP |
| POST | `/google` | Đăng nhập Google |
| POST | `/login` | Đăng nhập email/mật khẩu |
| POST | `/logout` | Đăng xuất |
| POST | `/refresh-token` | Refresh access token (cookie httpOnly) |
| POST | `/forgot-password` | Gửi OTP quên mật khẩu |
| POST | `/verify-forgot-password-otp` | Xác thực OTP quên mật khẩu (trả resetToken) |
| POST | `/reset-password` | Đặt lại mật khẩu |

### Users — `/api/users`

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/user-info` | Thông tin user hiện tại |
| POST | `/upload-avatar` | Upload avatar qua Cloudinary (xóa avatar cũ) |
| PATCH | `/update-profile` | Cập nhật hồ sơ cá nhân |
| POST | `/change-password` | Đổi mật khẩu khi đang đăng nhập (tùy chọn thu hồi mọi phiên khác) |
| GET | `/sessions` | Danh sách thiết bị đang đăng nhập (đánh dấu thiết bị hiện tại) |
| DELETE | `/sessions/:id` | Đăng xuất một thiết bị cụ thể |
| DELETE | `/sessions` | Đăng xuất khỏi tất cả thiết bị, kể cả máy đang gọi |

### Payments — `/api/payments`

Gia sư trả phí nhận lớp sau khi đơn được duyệt.

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/providers` | tutor | Các cổng thanh toán đã cấu hình |
| POST | `/class-fee` | tutor | Khởi tạo giao dịch → trả URL cổng để redirect |
| GET | `/mine` | tutor | Lịch sử hóa đơn phí nhận lớp của mình |
| GET | `/:provider/return` | public | Cổng redirect người dùng về; xác thực bằng chữ ký rồi bounce sang FE |
| POST | `/:provider/ipn` | public | Callback server-to-server của cổng (ACK) |

Hai endpoint cuối **không có JWT** vì do cổng gọi, không phải trình duyệt người dùng —
tin cậy dựa trên chữ ký của cổng, không dựa vào phiên đăng nhập.

### Tutors — `/api/tutors`

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/register` | Đăng ký hồ sơ gia sư (trạng thái PENDING) |
| POST | `/upload-document` | Upload ảnh giấy tờ (CCCD/thẻ sinh viên/bằng cấp) → `{ url }` |
| GET | `/profile` | Hồ sơ gia sư của user hiện tại |
| GET | `/profile/change-request` | Yêu cầu đổi hồ sơ đang chờ của tutor |
| POST | `/profile/change-request` | Gia sư gửi yêu cầu đổi hồ sơ (chờ admin duyệt) |
| GET | `/active` `/top` `/top/month/current` `/new` `/search` | Danh sách công khai (chỉ APPROVED) |
| GET | `/:id` | Chi tiết gia sư (chỉ APPROVED) |

### Locations — `/api/locations`

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/provinces` | Danh sách tỉnh/thành |
| GET | `/provinces/:provinceCode/districts` | Quận/huyện theo tỉnh |
| GET | `/schools` | Danh sách trường |

### Lookups — `/api/lookups`

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/all` | Danh mục động gom nhóm |
| GET | `/type/:type` | Danh mục theo loại (subject, gender, ...) |
| GET | `/districts/:province` | Quận/huyện theo tỉnh (shape `{value,label}`) |
| POST `/` `/bulk`, PATCH `/:id`, DELETE `/:id` `/type/:type` | Admin ghi danh mục |

### Subjects — `/api/subjects`

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/` | Danh sách môn active (public) |
| GET | `/admin` | Toàn bộ môn (admin) |
| POST `/`, PATCH `/:id` | Admin tạo/sửa môn |

### Notifications — `/api/notifications`

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/` | Thông báo của user hiện tại |
| PATCH | `/:id/read` | Đánh dấu một thông báo đã đọc |
| PATCH | `/read-all` | Đánh dấu tất cả đã đọc |

### Classes — `/api/classes`

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/quote` | Báo giá học phí (có thể áp mã ưu đãi) |
| POST | `/` | Đăng bài tìm gia sư (sinh `classCode`) |
| POST | `/invite` | Người đăng mời đích danh một gia sư dạy lớp |
| GET | `/invitations` | Gia sư xem lời mời dạy lớp của mình (role tutor) |
| POST | `/invitations/:applicationId/accept` | Gia sư nhận lời mời (role tutor) |
| POST | `/invitations/:applicationId/decline` | Gia sư từ chối lời mời (role tutor) |
| GET | `/` | Danh sách bài đăng (mask thông tin nhạy cảm theo người xem) |
| GET | `/subjects` | Danh sách môn |
| GET | `/pricing-config` | Cấu hình tính học phí |
| GET | `/:id` | Chi tiết bài đăng |
| GET | `/feed` | Feed theo môn (tutor) |
| GET | `/my-posts` | Bài đăng của tôi (người đăng) |
| PUT `/:id`, DELETE `/:id` | Chủ bài đăng sửa/xóa (xóa mềm) |
| POST | `/:id/complete` | Người đăng/gia sư xác nhận hoàn thành lớp |
| POST | `/:id/apply` | Gia sư ứng tuyển nhận lớp (role tutor) |
| GET | `/mine` | Đơn nhận lớp của tutor |
| GET | `/:id/applicants` | Người đăng xem danh sách gia sư ứng tuyển |
| POST | `/:id/applicants/:applicationId/select` | Người đăng chọn 1 gia sư |
| POST | `/applications/:id/cancel` | Gia sư xin hủy đơn (role tutor) |

### Promos / Vouchers — `/api/promos`

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/validate` | Kiểm tra/áp mã ưu đãi ở màn báo giá |
| GET | `/mine` | Kho voucher cá nhân của user |
| GET `/`, POST `/`, PATCH `/:id`, DELETE `/:id` | Admin CRUD mã ưu đãi (xóa mềm) |

### Reviews — `/api/reviews`

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/` | Người đăng đánh giá gia sư (lớp đã hoàn thành) |
| GET | `/tutor/:tutorId` | Danh sách đánh giá công khai của gia sư (cũng dùng cho gia sư xem đánh giá của chính mình) |

### Chat — `/api/chat` (yêu cầu đăng nhập)

Mỗi người dùng không phải admin (gia sư hoặc học viên) có một cuộc trò chuyện duy nhất với admin.

| Method | Endpoint | Vai trò | Mô tả |
|---|---|---|---|
| GET | `/my-conversation` | tutor/user | Lấy (hoặc tạo) hội thoại của mình + 1 trang tin nhắn |
| GET | `/my-conversation/unread-count` | tutor/user | Số tin chưa đọc của mình |
| POST | `/my-conversation/messages` | tutor/user | Gửi tin nhắn văn bản |
| POST | `/my-conversation/images` | tutor/user | Gửi tin nhắn kèm ảnh (multipart `image`) |
| POST | `/my-conversation/read` | tutor/user | Đánh dấu đã đọc |
| GET | `/conversations` | admin | Danh sách hội thoại (lọc theo tên/email) |
| GET | `/conversations/unread-count` | admin | Tổng tin chưa đọc (badge) |
| POST | `/conversations` | admin | Admin chủ động mở hội thoại với một người dùng |
| GET | `/conversations/:id/messages` | admin | Tin nhắn của một hội thoại |
| POST | `/conversations/:id/messages` | admin | Admin gửi tin nhắn |
| POST | `/conversations/:id/images` | admin | Admin gửi tin nhắn kèm ảnh |
| POST | `/conversations/:id/read` | admin | Đánh dấu đã đọc |

**Realtime (Socket.IO):** client kết nối tới cùng host (không có `/api`), xác thực bằng access token qua `handshake.auth.token`. Mỗi user vào phòng `user:<id>`, admin vào thêm phòng `admins`. Server phát các sự kiện `chat:message`, `chat:read`, `chat:conversation` để đồng bộ tin nhắn, trạng thái đã đọc và hội thoại mới.

### Chatbot — `/api/chatbot`

BE **proxy** câu hỏi người dùng sang **chatbot-service** (FastAPI riêng, xem [`../chatbot-service`](../chatbot-service)); BE không tự xử lý hội thoại. Không có model/DB — chỉ `route → middleware → controller → service` (gọi HTTP bằng **axios** qua client nội bộ dùng chung [`utils/serviceClient.js`](src/utils/serviceClient.js), tái dùng cho các AI-service khác về sau như quét CCCD).

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| POST | `/` | optional | Hỏi trợ lý ảo. Có token → forward `Authorization: Bearer` + `user{id,role}` xuống chatbot cho câu "của tôi"; không token → vẫn trả lời câu hỏi chung |

- **Rate limit** (`express-rate-limit`): **chỉ bật ở production** (dev bỏ qua để test thoải mái) — mặc định 20 req/60s/IP → vượt trả `429`, chống spam đốt quota LLM. Chỉnh bằng `CHATBOT_RATE_MAX`/`CHATBOT_RATE_WINDOW_MS`. Sau reverse proxy hosting cần `trust proxy` (cũng chỉ bật ở production trong `app.js`) để đếm đúng theo IP client.
- Body: `{ message (bắt buộc), history?, sessionId? }` (validate bằng `chatbot.validation`).
- Middleware `buildChatbotRequest` bóc token + chuẩn hoá `user` vào `req.chatbotRequest`; controller chỉ gọi service + trả data.
- Header `X-Internal-Secret` tự gắn khi đặt `CHATBOT_INTERNAL_SECRET` (xác thực service-to-service).
- Chatbot lỗi/tắt/timeout → `503` với thông báo rõ ràng, không làm sập BE.
- Biến môi trường: `CHATBOT_URL` (mặc định `http://localhost:8001`), `CHATBOT_INTERNAL_SECRET`, `CHATBOT_TIMEOUT_MS` (mặc định `20000`).

### Admin — `/api/admin` (toàn bộ yêu cầu role `admin`)

Mỗi nhóm là một router con (`<chức năng>Admin.routes.js`) mount trong `admin.routes.js`:

- **Users** (`/users`): `GET /`, `PATCH /:id`, `PATCH /:id/status`, `DELETE /:id` (xóa mềm; chặn tự thao tác chính mình)
- **Classes** (`/classes`): `GET /`, `GET /:id`, `DELETE /:id`
- **Trash** (`/trash`, thùng rác / xóa mềm): `GET /counts`, `GET /:type`, `PATCH /:type/:id/restore`, `DELETE /:type/:id`
- **Tutors** (`/tutors`): `GET /stats`, `GET /pending`, `PATCH /:id/approve`, `PATCH /:id/reject`
- **Class applications** (`/class-applications`): `GET /stats`, `GET /`, `PATCH /:id/approve|reject`
- **Application cancellations** (`/application-cancellations`): `GET /`, `PATCH /:id/approve|reject`
- **Reviews** (`/reviews`): `GET /tutors`, `GET /tutors/:tutorId`, `DELETE /:id`
- **Profile changes** (`/profile-changes`): `GET /`, `PATCH /:id/approve|reject`
- **Payments** (`/payments`): `GET /` — hóa đơn phí nhận lớp của toàn hệ thống
- **Stats** (`/stats`): `GET /summary` — số liệu tổng hợp cho dashboard và trang thống kê

### Settings — `/api/settings`

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/footer` | Cấu hình chân trang (public) |
| PUT | `/footer` | Cập nhật chân trang (admin) |

## Luồng Nghiệp Vụ Chính

- **Đăng ký**: tạo pending registration + gửi OTP; verify OTP mới tạo user thực sự. Login trả access token, refresh token gửi theo kênh của client (cookie httpOnly cho web, body cho mobile).
- **Phiên đăng nhập theo thiết bị**: mỗi lần đăng nhập tạo một phần tử trong `user.sessions`, giữ refresh token riêng + tên/loại thiết bị (`utils/device.js` đoán từ User-Agent; app mobile tự khai qua header `x-device-name`). Nhờ vậy đăng nhập song song nhiều máy được, và thu hồi được **đúng một máy** mà không đá các máy còn lại.
  - `/auth/refresh-token` **xoay token tại chỗ** trong phiên hiện có, không mở phiên mới — nếu không mỗi lần gia hạn sẽ đẻ thêm một dòng "thiết bị" giả.
  - Hạn refresh token là `REFRESH_TOKEN_TTL_DAYS` (mặc định 30) — vì có xoay vòng nên đây là **hạn không hoạt động**: còn dùng app thì phiên tự gia hạn, im lặng quá lâu mới phải đăng nhập lại. Một biến này chi phối cả hạn JWT lẫn `maxAge` cookie để hai giá trị không lệch nhau.
  - `/auth/logout` chỉ đóng phiên của thiết bị đang gọi. Mất cookie (không xác định được phiên) thì đóng hết, tránh phiên mồ côi không ai gỡ được.
- **Mật khẩu**: quy tắc độ mạnh nằm ở `constants/password.js` (tối thiểu 10 ký tự, có in hoa và ký tự đặc biệt), dùng chung cho đăng ký, đặt lại và đổi mật khẩu. Đặt lại mật khẩu qua OTP quên mật khẩu sẽ **đóng sạch mọi phiên** vì tình huống này thường do nghi lộ tài khoản; đổi mật khẩu khi đang đăng nhập thì người dùng tự chọn có thu hồi thiết bị khác hay không.
- **Thanh toán phí nhận lớp**: đơn được duyệt → gia sư trả phí (`CLASS_FEE_RATE`, hiện 12% học phí tháng đầu, làm tròn tới 1.000đ) qua cổng sandbox tự chọn. BE tạo giao dịch `pending` + URL cổng; cổng gọi về `/return` (redirect người dùng) và `/ipn` (server-to-server), cả hai xác thực bằng chữ ký rồi chuyển giao dịch sang `success`/`failed`.
- **Gia sư**: user gửi hồ sơ kèm ảnh giấy tờ (CCCD + thẻ sinh viên/bằng cấp) → `tutor.service` tạo profile `PENDING` + notify; `tutorAdmin.service` approve (→ `APPROVED`, nâng role user lên `tutor`) hoặc reject (kèm lý do). Gia sư phải có hồ sơ giấy tờ đầy đủ trước khi được nhận/được mời lớp.
- **Đổi hồ sơ gia sư**: tutor gửi `profile change request` (whitelist field) → notify admin → `profileChangeAdmin.service` duyệt mới áp dụng vào Tutor.
- **Vòng đời bài đăng** (`CLASS_STATUS`): `open` → `matched` (đã ghép gia sư) / `expired` (quá giờ chưa có ai nhận) → `completed` (hai phía xác nhận). Job nền tự đánh dấu `expired`. Danh sách công khai ẩn cả `matched`, `expired` và `completed`; ngoài ra gia sư đã ấn nhận lớp thì không thấy lại lớp đó nữa.
- **Ghép gia sư qua ứng tuyển** (`CLASS_APPLICATION_STATUS`): tutor `apply` (PENDING) → người đăng `select` 1 gia sư (SELECTED) → admin approve (APPROVED → lớp `matched`, các ứng viên khác `NOT_SELECTED`, `$inc` thống kê tutor) / reject (REJECTED, người đăng chọn lại). Tutor có thể xin hủy đơn (CANCEL_REQUESTED) → `cancellationAdmin` duyệt (CANCELLED) hoặc từ chối.
- **Ghép gia sư qua lời mời trực tiếp** (`CLASS_APPLICATION_ORIGIN`): người đăng `invite` một gia sư cụ thể → tạo đơn lời mời + notify gia sư → gia sư `accept` (vào luồng duyệt như ứng tuyển) hoặc `decline`.
- **Hoàn thành & thưởng**: cả người đăng và gia sư xác nhận `complete` → lớp `completed` → tặng voucher (notify `CLASS_COMPLETED_REWARD`). Người đăng được đánh giá gia sư 1 lần/lớp; đánh giá cập nhật `ratingSum`/`reviewCount`/`averageRating` của tutor.
- **Mã ưu đãi**: admin tạo mã toàn cục; voucher cá nhân (`ownerUserId`) nằm trong kho của từng user; áp ở màn báo giá (`promo.validate`), lưu `promoCode`/`promoDiscount`/`finalFeePerMonth` trên lớp.
- **Chat người dùng ↔ admin**: gia sư/học viên nhắn tới admin qua hội thoại duy nhất của mình; admin xem danh sách và trả lời. Tin nhắn (kèm ảnh tùy chọn) lưu MongoDB, đồng bộ realtime qua Socket.IO; đếm chưa đọc hai phía (`tutorUnread`/`adminUnread`).
- **Thông báo**: lưu trong MongoDB theo `userId`; khi mark read set `readAt`, TTL tự xóa sau 7 ngày.
- **Xóa mềm / thùng rác**: classes, promos, reviews, users dùng `deletedAt`/`deletedBy`; admin xem/khôi phục/xóa hẳn qua `/admin/trash`.

## Quy Ước Code

- Controller chỉ nhận request, gọi service và trả `successResponse()` (`{ success, message, data }`).
- Service chứa logic nghiệp vụ, gọi repository, throw `AppError(message, HTTP_STATUS.CODE)` cho lỗi người dùng.
- Mapper chuyển DB document thành DTO; service gọi mapper, không format response inline.
- Repository chỉ thao tác MongoDB/Mongoose.
- Middleware order: `authMiddleware`(`/.optional`) → `roleMiddleware(...)` → `validate`/`validateQuery`/`validateBody` → controller.
- Joi validation đặt trong `<module>.validation.js`.
- Notification nghiệp vụ tạo ở service khi trạng thái đổi, không chỉ ở FE.
- Realtime chat phát qua helper `emitToUser`/`emitToAdmins` (`configs/socket.js`); service phát sự kiện khi có tin nhắn/đọc/hội thoại mới — an toàn khi Socket.IO chưa khởi tạo.
- Mask thông tin nhạy cảm lớp (`contactPhone`/`locationLabel`) theo người xem; chỉ admin, người đăng, hoặc tutor có đơn `APPROVED` thấy đầy đủ.
- Không hardcode tỉnh/quận/môn; dùng `locations`/`lookup`/`subject`.
- Quy tắc độ mạnh mật khẩu chỉ khai báo ở `constants/password.js`; validation import từ đó, không viết lại regex.
- Rẽ nhánh web/mobile chỉ nằm trong `utils/token.js`; service và controller không tự đọc header `x-client-platform`.
- `settings` tuân theo controller → service → repository; dữ liệu footer/hợp đồng mẫu chỉ đọc từ model `Settings` (key/value `Mixed`), không tự tạo nội dung mặc định.
