// Vai trò người tham gia trong một cuộc trò chuyện người dùng ↔ admin.
// "tutor" đại diện cho phía người dùng (gồm cả gia sư lẫn học viên), "admin" là phía quản trị.
const CHAT_ROLES = {
  TUTOR: "tutor",
  ADMIN: "admin",
};

// Loại "thẻ thông tin" admin có thể đính kèm vào tin nhắn (chỉ hiển thị thông tin
// công khai + nút mở trang chi tiết). "tutor" → hồ sơ gia sư; "class" → bài đăng lớp.
const CHAT_CARD_KINDS = {
  TUTOR: "tutor",
  CLASS: "class",
};

module.exports = { CHAT_ROLES, CHAT_CARD_KINDS };
