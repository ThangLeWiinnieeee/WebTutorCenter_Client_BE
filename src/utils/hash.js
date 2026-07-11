const bcrypt = require("bcryptjs");

// 12 rounds: chậm hơn ~4x so với 10 nhưng khó brute-force hơn nhiều; vẫn dưới 100ms/hash.
// Hash cũ (10 rounds) vẫn verify được vì rounds được nhúng trong chuỗi hash → không cần backfill.
const SALT_ROUNDS = 12;

const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

const comparePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = { hashPassword, comparePassword };
