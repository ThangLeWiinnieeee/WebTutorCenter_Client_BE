// Quy tắc độ mạnh mật khẩu — dùng CHUNG cho đăng ký, đặt lại và đổi mật khẩu.
// Độ dài do Joi .min(10) lo; regex chỉ kiểm tra độ phức tạp (in hoa + ký tự đặc biệt).
const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).+$/;
const PASSWORD_COMPLEXITY_MESSAGE =
  "Mật khẩu phải có ít nhất 1 chữ in hoa và 1 ký tự đặc biệt";

module.exports = {
  PASSWORD_MIN_LENGTH,
  PASSWORD_COMPLEXITY_REGEX,
  PASSWORD_COMPLEXITY_MESSAGE,
};
