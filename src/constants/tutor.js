const OCCUPATION_STATUS = require("./occupationStatus");

const TUTOR_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

const GENDER_OPTIONS = ["male", "female", "other"];
const TUTOR_LEVEL_OPTIONS = ["student", "teacher", "any"];
const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PHONE_REGEX = /^(84|0)(3|5|7|8|9)[0-9]{8}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// "Mức độ quan tâm" của gia sư với một môn (lưu ở tutor.subjectAffinity), dùng để đẩy môn
// tương tác nhiều lên đầu feed — giống bảng tin FB/TikTok, ưu tiên hành vi GẦN ĐÂY.
// - WEIGHT: điểm cộng mỗi lần tương tác (ứng tuyển = ý định mạnh nhất → cao nhất; xem lớp = yếu nhất).
// - HALF_LIFE_MS: điểm giảm còn một nửa sau mỗi 14 ngày → quan tâm cũ tự phai, không ghim top mãi.
// - MAX_SCORE: trần điểm mỗi môn, chặn xem/nhận dồn 1 môn làm điểm phình vô hạn.
// - MIN_SCORE: dưới ngưỡng này coi như đã hết quan tâm → bỏ khỏi xếp hạng (về lại sort mới nhất).
// - FILTER_THROTTLE_MS: lọc/search lại CÙNG một môn trong khoảng này thì KHÔNG cộng điểm nữa
//   (chống spam lọc đi lọc lại). Mốc tính theo từng môn nên đổi qua lại giữa các môn vẫn giữ
//   nguyên cửa sổ 60s của mỗi môn.
// - VIEW_DEDUP_TTL_MS: một lớp đã xem chỉ cộng điểm 1 lần; bản ghi "đã xem" tự hết hạn sau 90 ngày
//   (khi đó điểm 1 lượt xem cũng đã phai gần hết) → cho phép tính lại như quan tâm mới, tránh phình DB.
const SUBJECT_AFFINITY = {
  WEIGHT: { VIEW: 1, FILTER: 2, APPLY: 5 },
  HALF_LIFE_MS: 14 * 24 * 60 * 60 * 1000,
  MAX_SCORE: 20,
  MIN_SCORE: 0.5,
  FILTER_THROTTLE_MS: 60 * 1000,
  VIEW_DEDUP_TTL_MS: 90 * 24 * 60 * 60 * 1000,
};

module.exports = {
  OCCUPATION_STATUS,
  TUTOR_STATUS,
  GENDER_OPTIONS,
  TUTOR_LEVEL_OPTIONS,
  DAYS_OF_WEEK,
  PHONE_REGEX,
  TIME_REGEX,
  SUBJECT_AFFINITY,
};
