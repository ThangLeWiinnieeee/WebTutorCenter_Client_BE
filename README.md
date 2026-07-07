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

Tạo file `.env` trong thư mục backend và điền các biến cần thiết cho server (PORT, NODE_ENV), MongoDB (`MONGODB_URI`/`MONGO_URI`), JWT, email, Google OAuth, Cloudinary và CORS theo môi trường chạy của bạn.

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
├── configs/            # database, cloudinary, cors, dns, socket (Socket.IO)
├── constants/          # status, message, role, otpType, accountType, occupationStatus, tutor
├── middlewares/        # auth (+ .optional), role, validate, error
└── utils/              # token, response, hash, email, otp, upload, pagination,
                        #   code, classLifecycle (scheduler), locationCache, search, AppError
```

**Cache tỉnh/huyện (`utils/locationCache.js`)**: dữ liệu tỉnh/huyện là tĩnh nên được nạp toàn bộ vào RAM (Map theo `code`) thay vì query MongoDB theo từng mã. Loại bỏ N+1 khi resolve tên khu vực ở `TutorMapper`, `profileChangeRequest.mapper` và `class.service` (danh sách gia sư/lớp: từ ~N query location/trang → 0). Tự làm mới bằng TTL (10 phút) — sau khi cập nhật DB, cache tự nạp lại data mới mà không cần restart; cần tức thì thì gọi `invalidate()`. Preload sẵn lúc server khởi động.

Submodule trong `classes`: `class.application.*` (ứng tuyển / chọn / hủy nhận lớp + lời mời dạy trực tiếp) và `class.pricing.*` (model + repository tính học phí, có cache). Module `otp` là nội bộ của auth (`otp.model`, `otp.repository`, `utils/otp`). `pendingRegistration` lưu đăng ký chờ xác thực OTP trước khi tạo user.

**Khu vực admin** được tách thành nhiều router/controller/service theo từng chức năng thay vì một module `admin` duy nhất: `userAdmin`, `classAdmin`, `trashAdmin`, `tutorAdmin`, `classApplicationAdmin`, `cancellationAdmin`, `reviewAdmin`, `profileChangeAdmin`. Tất cả được gom lại trong `admin.routes.js` và mount dưới `/api/admin` (đã áp sẵn `authMiddleware` + `roleMiddleware("admin")`).

**Chat** gồm `chat.controller/service/validation`, model `conversation`/`message`, repository tương ứng và mapper `conversation`/`message`. Mỗi người dùng (gia sư hoặc học viên) có đúng một cuộc trò chuyện với admin (`findOrCreateByTutorUserId`).

## API Overview

Tất cả route mount dưới `/api` (`src/routes/index.js`): `auth`, `users`, `tutors`, `locations`, `notifications`, `classes`, `lookups`, `subjects`, `admin`, `settings`, `promos`, `reviews`, `chat`.

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

### Settings — `/api/settings`

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/footer` | Cấu hình chân trang (public) |
| PUT | `/footer` | Cập nhật chân trang (admin) |

## Luồng Nghiệp Vụ Chính

- **Đăng ký**: tạo pending registration + gửi OTP; verify OTP mới tạo user thực sự. Login trả access token, refresh token lưu cookie httpOnly.
- **Gia sư**: user gửi hồ sơ kèm ảnh giấy tờ (CCCD + thẻ sinh viên/bằng cấp) → `tutor.service` tạo profile `PENDING` + notify; `tutorAdmin.service` approve (→ `APPROVED`, nâng role user lên `tutor`) hoặc reject (kèm lý do). Gia sư phải có hồ sơ giấy tờ đầy đủ trước khi được nhận/được mời lớp.
- **Đổi hồ sơ gia sư**: tutor gửi `profile change request` (whitelist field) → notify admin → `profileChangeAdmin.service` duyệt mới áp dụng vào Tutor.
- **Vòng đời bài đăng** (`CLASS_STATUS`): `open` → `matched` (đã ghép gia sư) / `expired` (quá giờ chưa có ai nhận) → `completed` (hai phía xác nhận). Job nền tự đánh dấu `expired`.
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
- **Ngoại lệ có chủ đích**: `settings` không có service (logic trong controller, thao tác model `Settings` key/value `Mixed`).
