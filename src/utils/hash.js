const bcrypt = require("bcryptjs");

// 12 rounds: khó brute-force hơn; hash cũ vẫn verify được (rounds nhúng trong chuỗi hash)
const SALT_ROUNDS = 12;

// Băm mật khẩu
const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

// So sánh mật khẩu thô với mật khẩu đã băm
const comparePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = { hashPassword, comparePassword };
