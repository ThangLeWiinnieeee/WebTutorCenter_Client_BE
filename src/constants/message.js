const MESSAGE = {
  // Auth
  REGISTER_SUCCESS: "Đăng ký thành công",
  LOGIN_SUCCESS: "Đăng nhập thành công",
  GOOGLE_LOGIN_SUCCESS: "Đăng nhập bằng Google thành công",
  GOOGLE_TOKEN_INVALID: "Google token không hợp lệ",
  LOGOUT_SUCCESS: "Đăng xuất thành công",
  REFRESH_TOKEN_SUCCESS: "Làm mới token thành công",
  EXISTING_ACCOUNT_LOCAL: "Tài khoản này đã được đăng ký bằng tài khoản local",
  EXISTING_ACCOUNT_GOOGLE: "Tài khoản này đã được đăng nhập bằng Google",

  // User
  USER_NOT_FOUND: "Không tìm thấy người dùng",
  UPDATE_PROFILE_SUCCESS: "Cập nhật thông tin cá nhân thành công",
  UPLOAD_AVATAR_SUCCESS: "Cập nhật ảnh đại diện thành công",
  UPLOAD_AVATAR_FAILED: "Tải ảnh lên thất bại",
  EMAIL_ALREADY_EXISTS: "Email đã được sử dụng",
  INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng",
  PASSWORD_MISMATCH: "Mật khẩu xác nhận không khớp",
  EMAIL_NOT_VERIFIED: "Email chưa được xác thực, vui lòng kiểm tra hộp thư",
  USER_INFO_SUCCESS: "Lấy thông tin người dùng thành công",

  // OTP
  OTP_SENT: "Mã OTP đã được gửi đến email của bạn",
  OTP_RESENT: "Mã OTP mới đã được gửi đến email của bạn",
  OTP_VERIFY_SUCCESS: "Xác thực email thành công",
  OTP_INVALID: "Mã OTP không hợp lệ",
  OTP_EXPIRED: "Mã OTP đã hết hạn, vui lòng yêu cầu mã mới",
  OTP_ALREADY_VERIFIED: "Email này đã được xác thực",
  OTP_RESEND_TOO_SOON: "Vui lòng chờ trước khi yêu cầu gửi lại mã OTP",
  REGISTRATION_NOT_FOUND: "Phiên đăng ký không tồn tại hoặc đã hết hạn, vui lòng đăng ký lại",

  // Forgot password
  FORGOT_PASSWORD_OTP_SENT: "Mã OTP khôi phục mật khẩu đã được gửi đến email của bạn",
  FORGOT_PASSWORD_OTP_VERIFY_SUCCESS: "Xác thực OTP thành công, vui lòng đặt lại mật khẩu",
  RESET_PASSWORD_SUCCESS: "Đặt lại mật khẩu thành công",
  RESET_TOKEN_INVALID: "Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn",
  ACCOUNT_NOT_CHANGE_PASSWORD: "Tài khoản này không thể đổi mật khẩu (đăng nhập qua Google)",
  RESET_PASSWORD_SAME_AS_OLD: "Mật khẩu mới không được trùng với mật khẩu cũ",

  // Token
  TOKEN_MISSING: "Không tìm thấy token xác thực",
  TOKEN_INVALID: "Token không hợp lệ hoặc đã hết hạn",
  TOKEN_EXPIRED: "Token đã hết hạn",
  REFRESH_TOKEN_INVALID: "Refresh token không hợp lệ",

  // Validation
  VALIDATION_ERROR: "Dữ liệu đầu vào không hợp lệ",
  QUERY_VALIDATION_ERROR: "Bộ lọc không hợp lệ",

  // Tutor
  TUTOR_REGISTER_SUCCESS: "Đăng ký làm gia sư thành công, vui lòng chờ phê duyệt",
  TUTOR_ALREADY_REGISTERED: "Bạn đã đăng ký làm gia sư trước đó",
  TUTOR_NOT_FOUND: "Không tìm thấy thông tin gia sư",
  TUTOR_GET_SUCCESS: "Lấy thông tin gia sư thành công",
  TUTOR_UPDATE_SUCCESS: "Cập nhật thông tin gia sư thành công",

  // Admin
  ADMIN_LIST_USERS_SUCCESS: "Lấy danh sách người dùng thành công",
  ADMIN_UPDATE_USER_SUCCESS: "Cập nhật người dùng thành công",
  ADMIN_UPDATE_USER_STATUS_SUCCESS: "Cập nhật trạng thái người dùng thành công",
  ADMIN_DELETE_USER_SUCCESS: "Xóa người dùng thành công",
  ADMIN_SELF_DEACTIVATE: "Không thể vô hiệu hóa chính tài khoản đang đăng nhập",
  ADMIN_SELF_DELETE: "Không thể xóa chính tài khoản đang đăng nhập",
  ADMIN_SELF_ROLE_CHANGE: "Không thể thay đổi vai trò của chính tài khoản đang đăng nhập",

  // Server
  INTERNAL_SERVER_ERROR: "Lỗi máy chủ nội bộ",
  FORBIDDEN: "Bạn không có quyền thực hiện hành động này",

  // Class Application
  CLASS_APPLICATION_APPLY_SUCCESS: "Đã ứng tuyển lớp, vui lòng chờ người đăng chọn gia sư",
  CLASS_APPLICATION_ALREADY_EXISTS: "Bạn đã ứng tuyển lớp này trước đó",
  CLASS_APPLICATION_OWN_CLASS: "Bạn không thể nhận lớp do chính mình đăng",
  CLASS_APPLICATION_NOT_FOUND: "Không tìm thấy đơn đăng ký nhận lớp",
  CLASS_APPLICATION_NOT_PENDING: "Đơn đăng ký này không ở trạng thái chờ duyệt",
  CLASS_APPLICATION_NOT_SELECTED_STATUS: "Đơn này chưa được người đăng chọn nên không thể duyệt",
  CLASS_APPLICATION_LIST_SUCCESS: "Lấy danh sách đơn đăng ký nhận lớp thành công",
  CLASS_APPLICATION_STATS_SUCCESS: "Lấy thống kê đơn đăng ký nhận lớp thành công",
  CLASS_APPLICATION_APPROVE_SUCCESS: "Đã duyệt gia sư cho lớp thành công",
  CLASS_APPLICATION_REJECT_SUCCESS: "Đã từ chối đơn đăng ký nhận lớp",

  // Người đăng chọn gia sư từ danh sách ứng tuyển
  CLASS_APPLICANTS_LIST_SUCCESS: "Lấy danh sách gia sư ứng tuyển thành công",
  CLASS_APPLICANT_SELECT_SUCCESS: "Đã chọn gia sư, vui lòng chờ admin duyệt lớp",
  CLASS_APPLICANT_NOT_OWNER: "Bạn không có quyền quản lý ứng tuyển của bài đăng này",
  CLASS_APPLICANT_NOT_PENDING: "Chỉ có thể chọn gia sư đang ở trạng thái chờ",
  CLASS_APPLICANT_CLASS_NOT_OPEN: "Lớp này không còn ở trạng thái mở để chọn gia sư",

  // Hủy đơn nhận lớp (gia sư rút đơn)
  CLASS_APPLICATION_CANCEL_SUCCESS: "Đã hủy đơn nhận lớp",
  CLASS_APPLICATION_CANCEL_REQUEST_SUCCESS: "Đã gửi yêu cầu hủy lớp, vui lòng chờ admin duyệt",
  CLASS_APPLICATION_CANCEL_INVALID_STATUS: "Không thể hủy đơn ở trạng thái hiện tại",
  CLASS_APPLICATION_CANCELLATION_LIST_SUCCESS: "Lấy danh sách đơn hủy thành công",
  CLASS_APPLICATION_CANCEL_NOT_REQUESTED: "Đơn này không ở trạng thái chờ hủy",
  CLASS_APPLICATION_CANCEL_APPROVE_SUCCESS: "Đã duyệt hủy đơn nhận lớp",
  CLASS_APPLICATION_CANCEL_REJECT_SUCCESS: "Đã từ chối yêu cầu hủy đơn",

  // Mời gia sư trực tiếp (người đăng chọn gia sư cụ thể cho lớp)
  CLASS_INVITE_SUCCESS: "Đã gửi lời mời tới gia sư, vui lòng chờ gia sư phản hồi",
  CLASS_INVITE_TUTOR_NOT_FOUND: "Không tìm thấy gia sư được mời",
  CLASS_INVITE_TUTOR_NOT_APPROVED: "Gia sư này chưa được duyệt nên không thể mời",
  CLASS_INVITE_OWN: "Bạn không thể tự mời chính mình",
  CLASS_INVITE_SUBJECT_MISMATCH: "Gia sư này không dạy môn bạn chọn",
  CLASS_INVITE_AREA_MISMATCH: "Khu vực bạn chọn không nằm trong khu vực gia sư có thể dạy",
  CLASS_INVITE_SLOT_MISMATCH: "Khung giờ bạn chọn không nằm trong lịch dạy của gia sư",
  CLASS_INVITE_PREF_MISMATCH: "Yêu cầu giới tính/trình độ không khớp với hồ sơ gia sư",
  CLASS_INVITE_ALREADY_EXISTS: "Bạn đã mời gia sư này cho một lớp khác đang chờ phản hồi",
  CLASS_INVITATIONS_LIST_SUCCESS: "Lấy danh sách lời mời thành công",
  CLASS_INVITE_NOT_FOUND: "Không tìm thấy lời mời",
  CLASS_INVITE_NOT_PENDING: "Lời mời này không còn ở trạng thái chờ phản hồi",
  CLASS_INVITE_ACCEPT_SUCCESS: "Đã đồng ý nhận lớp, vui lòng chờ admin duyệt",
  CLASS_INVITE_DECLINE_SUCCESS: "Đã từ chối lời mời",

  // Profile change request (gia sư đổi hồ sơ — chờ admin duyệt)
  PROFILE_CHANGE_REQUEST_SUCCESS: "Đã gửi yêu cầu đổi thông tin, vui lòng chờ admin duyệt",
  PROFILE_CHANGE_GET_SUCCESS: "Lấy yêu cầu đổi thông tin thành công",
  PROFILE_CHANGE_LIST_SUCCESS: "Lấy danh sách yêu cầu đổi thông tin thành công",
  PROFILE_CHANGE_APPROVE_SUCCESS: "Đã duyệt yêu cầu đổi thông tin",
  PROFILE_CHANGE_REJECT_SUCCESS: "Đã từ chối yêu cầu đổi thông tin",
  PROFILE_CHANGE_NOT_FOUND: "Không tìm thấy yêu cầu đổi thông tin",
  PROFILE_CHANGE_NOT_PENDING: "Yêu cầu này không ở trạng thái chờ duyệt",
  PROFILE_CHANGE_ALREADY_PENDING: "Bạn đang có một yêu cầu đổi thông tin chờ duyệt",
  PROFILE_CHANGE_TUTOR_NOT_APPROVED: "Chỉ gia sư đã được duyệt mới có thể đổi hồ sơ",
  PROFILE_CHANGE_EMPTY: "Không có thông tin hợp lệ để cập nhật",
  PROFILE_CHANGE_INVALID_SUBJECTS: "Danh sách môn học không hợp lệ (phải chọn ít nhất 1 môn trong danh mục)",
  PROFILE_CHANGE_SUBJECTS_REMOVE_FORBIDDEN: "Chỉ được bổ sung thêm môn học, không được bỏ môn đã đăng ký",
  PROFILE_CHANGE_INVALID_GRAD_YEAR: "Năm tốt nghiệp là bắt buộc và phải hợp lệ (từ 1950 đến năm hiện tại)",
  PROFILE_CHANGE_DOCUMENT_LOCKED:
    "Giấy tờ đã chứng thực không thể sửa lại. Bạn chỉ có thể bổ sung phần còn thiếu.",

  // Review (đánh giá gia sư)
  REVIEW_CREATE_SUCCESS: "Đánh giá gia sư thành công, cảm ơn bạn đã nhận xét",
  REVIEW_LIST_SUCCESS: "Lấy danh sách đánh giá thành công",
  REVIEW_ADMIN_TUTORS_SUCCESS: "Lấy danh sách gia sư để quản lý đánh giá thành công",
  REVIEW_DELETE_SUCCESS: "Đã chuyển đánh giá vào thùng rác",
  REVIEW_NOT_FOUND: "Không tìm thấy đánh giá",
  REVIEW_ALREADY_EXISTS: "Bạn đã đánh giá gia sư cho lớp này rồi",
  REVIEW_CLASS_NOT_COMPLETED: "Chỉ có thể đánh giá khi lớp đã hoàn thành",
  REVIEW_NOT_POSTER: "Chỉ người đăng bài mới được đánh giá gia sư của lớp này",
  REVIEW_TUTOR_NOT_FOUND: "Lớp này chưa có gia sư nhận nên không thể đánh giá",
  REVIEW_REPLY_SUCCESS: "Đã gửi phản hồi đánh giá",
  REVIEW_REPLY_NOT_OWNER: "Bạn chỉ có thể phản hồi đánh giá dành cho chính mình",
  REVIEW_REPLY_ALREADY_EXISTS:
    "Bạn đã phản hồi đánh giá này rồi. Mỗi đánh giá chỉ được phản hồi một lần.",

  // Class
  QUOTE_SUCCESS: "Tính học phí lớp mới thành công",
  CREATE_SUCCESS: "Đăng lớp mới thành công",
  LIST_SUCCESS: "Lấy danh sách lớp mới thành công",
  CLASS_FEED_SUCCESS: "Lấy danh sách bài đăng theo môn thành công",
  MY_POSTS_SUCCESS: "Lấy danh sách bài đăng của bạn thành công",
  DETAIL_SUCCESS: "Lấy chi tiết lớp mới thành công",
  SUBJECT_LIST_SUCCESS: "Lấy danh sách môn học thành công",
  SUBJECT_CREATE_SUCCESS: "Thêm môn học thành công",
  SUBJECT_UPDATE_SUCCESS: "Cập nhật môn học thành công",
  SUBJECT_NOT_FOUND: "Không tìm thấy môn học",
  SUBJECT_NAME_REQUIRED: "Tên môn học là bắt buộc",
  SUBJECT_ALREADY_EXISTS: "Môn học này đã tồn tại",
  PRICING_CONFIG_SUCCESS: "Lấy cấu hình học phí thành công",
  PRICING_CONFIG_MISSING: "Chưa cấu hình học phí, vui lòng chạy seed pricing",
  CLASS_NOT_FOUND: "Không tìm thấy lớp mới",
  INVALID_AREA: "Khu vực tỉnh/quận không hợp lệ",
  CLASS_UPDATE_SUCCESS: "Cập nhật bài đăng thành công",
  CLASS_DELETE_SUCCESS: "Đã xóa bài đăng",
  CLASS_COMPLETE_SUCCESS: "Đã xác nhận hoàn thành lớp",
  CLASS_TRASH_SUCCESS: "Đã chuyển bài đăng vào thùng rác",
  CLASS_EDIT_FORBIDDEN: "Bạn không có quyền sửa bài đăng này.",
  CLASS_EDIT_ONLY_OPEN: "Chỉ có thể sửa bài đăng khi đang mở (chưa ghép gia sư).",
  CLASS_EDIT_HAS_APPLICANTS: "Không thể sửa bài đăng khi đã có gia sư ứng tuyển. Vui lòng xử lý đơn trước.",
  CLASS_DELETE_FORBIDDEN: "Bạn không có quyền xóa bài đăng này.",
  CLASS_DELETE_HAS_APPLICANTS:
    "Không thể xóa bài đăng khi đã có gia sư ứng tuyển hoặc nhận lớp. Vui lòng liên hệ admin nếu cần.",
  CLASS_COMPLETE_ONLY_MATCHED: "Chỉ lớp đã có gia sư nhận mới có thể xác nhận hoàn thành.",
  CLASS_COMPLETE_FORBIDDEN: "Bạn không có quyền xác nhận hoàn thành lớp này.",

  // Class application (service) — thông báo nghiệp vụ tĩnh
  CLASS_APPLICATION_CLASS_CLOSED: "Lớp này không còn nhận đăng ký (đã có gia sư hoặc đã hết hạn).",
  CLASS_APPLICATION_CLASS_TAKEN: "Lớp này đã có gia sư được chọn hoặc đang xử lý, không thể nhận nữa.",
  CLASS_APPLICATION_DOCS_REQUIRED:
    "Bạn cần bổ sung ảnh CCCD và thẻ sinh viên/bằng cấp trong hồ sơ trước khi nhận lớp.",
  TUTOR_NOT_APPROVED: "Hồ sơ gia sư của bạn chưa được phê duyệt",

  // Profile change — giấy tờ
  PROFILE_CHANGE_CCCD_REQUIRED: "Vui lòng tải đủ ảnh CCCD mặt trước và mặt sau.",
  PROFILE_CHANGE_STUDENT_CARD_REQUIRED: "Vui lòng tải đủ ảnh thẻ sinh viên mặt trước và mặt sau.",
  PROFILE_CHANGE_CERTIFICATE_REQUIRED: "Vui lòng tải lên ít nhất 1 ảnh bằng cấp.",

  // Tutor — danh sách công khai + upload giấy tờ
  TUTOR_LIST_SUCCESS: "Lấy danh sách gia sư thành công",
  TUTOR_TOP_SUCCESS: "Lấy danh sách top gia sư thành công",
  TUTOR_TOP_MONTH_SUCCESS: "Lấy danh sách top gia sư tháng này thành công",
  TUTOR_NEW_SUCCESS: "Lấy danh sách gia sư mới thành công",
  TUTOR_SEARCH_SUCCESS: "Tìm kiếm gia sư thành công",
  TUTOR_UPLOAD_DOC_SUCCESS: "Tải ảnh lên thành công",
  TUTOR_UPLOAD_DOC_FAILED: "Tải ảnh lên thất bại, vui lòng thử lại",

  // Tutor admin
  TUTOR_ADMIN_STATS_SUCCESS: "Lấy thống kê dashboard thành công",
  TUTOR_ADMIN_PENDING_SUCCESS: "Lấy danh sách gia sư chờ duyệt thành công",
  TUTOR_ADMIN_APPROVE_SUCCESS: "Phê duyệt gia sư thành công",
  TUTOR_ADMIN_REJECT_SUCCESS: "Từ chối hồ sơ gia sư thành công",
  TUTOR_NOT_PENDING: "Hồ sơ này không ở trạng thái chờ duyệt",

  // Trash (admin)
  TRASH_LIST_SUCCESS: "Lấy danh sách thùng rác thành công",
  TRASH_COUNTS_SUCCESS: "Lấy số lượng thùng rác thành công",
  TRASH_RESTORE_SUCCESS: "Khôi phục thành công",
  TRASH_PURGE_SUCCESS: "Đã xóa vĩnh viễn",
  TRASH_TYPE_INVALID: "Loại dữ liệu không hợp lệ",
  TRASH_RESTORE_NOT_FOUND: "Không tìm thấy mục cần khôi phục",
  TRASH_PURGE_NOT_FOUND: "Không tìm thấy mục cần xóa",

  // Promo — controller
  PROMO_CREATE_SUCCESS: "Tạo mã ưu đãi thành công",
  PROMO_LIST_SUCCESS: "Lấy danh sách mã ưu đãi thành công",
  PROMO_UPDATE_SUCCESS: "Cập nhật mã ưu đãi thành công",
  PROMO_DELETE_SUCCESS: "Đã chuyển mã ưu đãi vào thùng rác",
  PROMO_APPLY_SUCCESS: "Áp dụng mã ưu đãi thành công",
  VOUCHER_LIST_SUCCESS: "Lấy danh sách mã giảm giá thành công",
  // Promo — service (nghiệp vụ)
  PROMO_PERCENT_OVER_100: "Giảm theo % không được vượt quá 100",
  PROMO_START_AFTER_END: "Ngày bắt đầu phải trước ngày hết hạn",
  PROMO_ALREADY_EXISTS: "Mã ưu đãi đã tồn tại",
  PROMO_IN_TRASH: "Mã này đang nằm trong thùng rác. Hãy khôi phục hoặc xóa vĩnh viễn trước khi tạo lại.",
  PROMO_NOT_FOUND: "Không tìm thấy mã ưu đãi",
  PROMO_CODE_REQUIRED: "Vui lòng nhập mã ưu đãi",
  PROMO_NOT_EXISTS: "Mã ưu đãi không tồn tại",
  PROMO_INACTIVE: "Mã ưu đãi đã ngừng áp dụng",
  PROMO_NOT_OWNED: "Mã này không thuộc về bạn",
  PROMO_NOT_STARTED: "Mã ưu đãi chưa có hiệu lực",
  PROMO_EXPIRED: "Mã ưu đãi đã hết hạn",
  PROMO_USAGE_EXCEEDED: "Mã ưu đãi đã hết lượt sử dụng",

  // Location
  LOCATION_PROVINCES_SUCCESS: "Lấy danh sách tỉnh/thành phố thành công",
  LOCATION_DISTRICTS_SUCCESS: "Lấy danh sách quận/huyện thành công",
  LOCATION_SCHOOLS_SUCCESS: "Lấy danh sách trường thành công",
  LOCATION_PROVINCE_CODE_INVALID: "Mã tỉnh/thành phố không hợp lệ",
  LOCATION_PROVINCE_NOT_FOUND: "Không tìm thấy tỉnh/thành phố",

  // Lookup
  LOOKUP_LIST_SUCCESS: "Lấy danh sách thành công",
  LOOKUP_ALL_SUCCESS: "Lấy danh sách lookup thành công",
  LOOKUP_CREATE_SUCCESS: "Tạo lookup thành công",
  LOOKUP_UPDATE_SUCCESS: "Cập nhật lookup thành công",
  LOOKUP_DELETE_SUCCESS: "Xóa lookup thành công",

  // Notification
  NOTIFICATION_LIST_SUCCESS: "Lấy danh sách thông báo thành công",
  NOTIFICATION_MARK_READ_SUCCESS: "Đã đánh dấu đã đọc",
  NOTIFICATION_MARK_ALL_READ_SUCCESS: "Đã đánh dấu tất cả đã đọc",
  NOTIFICATION_NOT_FOUND: "Không tìm thấy thông báo",

  // Settings (footer)
  SETTINGS_FOOTER_GET_SUCCESS: "Lấy thông tin chân trang thành công",
  SETTINGS_FOOTER_UPDATE_SUCCESS: "Cập nhật thông tin chân trang thành công",
  SETTINGS_FOOTER_REQUIRED: "Địa chỉ, số điện thoại và email là bắt buộc",

  // Chat (người dùng ↔ admin)
  CHAT_GET_CONVERSATION_SUCCESS: "Lấy cuộc trò chuyện thành công",
  CHAT_MESSAGE_SENT: "Đã gửi tin nhắn",
  CHAT_MARK_READ_SUCCESS: "Đã đánh dấu đã đọc",
  CHAT_UNREAD_COUNT_SUCCESS: "Lấy số tin chưa đọc thành công",
  CHAT_CONVERSATIONS_SUCCESS: "Lấy danh sách hội thoại thành công",
  CHAT_MESSAGES_SUCCESS: "Lấy tin nhắn thành công",
  CHAT_CONVERSATION_OPENED: "Đã mở cuộc trò chuyện",
  CHAT_CONTENT_OR_IMAGE_REQUIRED: "Vui lòng nhập nội dung hoặc đính kèm ảnh",
  CHAT_CONVERSATION_NOT_FOUND: "Không tìm thấy cuộc trò chuyện",
  CHAT_CANNOT_MESSAGE_ADMIN: "Không thể nhắn tin với quản trị viên",

  // Chatbot (proxy trợ lý ảo)
  CHATBOT_ANSWER_SUCCESS: "Trả lời thành công",
  CHATBOT_RATE_LIMITED: "Bạn gửi câu hỏi hơi nhanh, vui lòng thử lại sau ít phút.",

  // Auth (bổ sung)
  ACCOUNT_DEACTIVATED: "Tài khoản của bạn đã bị vô hiệu hóa",

  // Notification content — nội dung thông báo tĩnh
  NOTIF_TUTOR_PENDING: "Hồ sơ gia sư của bạn đang chờ xét duyệt. Chúng tôi sẽ thông báo khi có kết quả.",
  NOTIF_TUTOR_APPROVED:
    "Chúc mừng! Hồ sơ gia sư của bạn đã được phê duyệt. Bạn chính thức trở thành gia sư.",
  NOTIF_REVIEW_REPLIED: "Gia sư đã phản hồi đánh giá của bạn. Xem phản hồi trong trang chi tiết gia sư.",
};

module.exports = MESSAGE;
