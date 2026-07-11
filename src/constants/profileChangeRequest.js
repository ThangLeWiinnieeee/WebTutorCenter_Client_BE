const PROFILE_CHANGE_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

// Các field hồ sơ gia sư được phép đổi (qua duyệt). Field khác (schoolName,
// status, stats...) bị loại bỏ cả khi tạo yêu cầu lẫn khi admin duyệt — để những
// yêu cầu cũ còn chứa các field không còn cho phép (vd đổi tên trường) không bị
// áp vào hồ sơ dù admin lỡ bấm duyệt. Nguồn duy nhất, dùng chung request + admin.
const PROFILE_CHANGE_EDITABLE_FIELDS = [
  "phone",
  "occupationStatus",
  "teachingAreas",
  "currentArea",
  "availability",
  "bio",
  "subjects",
  "graduationYear",
  // Hồ sơ chứng thực (bổ sung/cập nhật) — duyệt cùng luồng đổi hồ sơ
  "cccdFrontImage",
  "cccdBackImage",
  "studentCardFrontImage",
  "studentCardBackImage",
  "certificateImages",
  // Bằng cấp công khai (không phải giấy tờ chứng thực) — đổi tự do, vẫn qua duyệt admin.
  "publicCertificateImages",
];

module.exports = { PROFILE_CHANGE_STATUS, PROFILE_CHANGE_EDITABLE_FIELDS };
