// Chống NoSQL injection: loại bỏ khỏi input mọi key có thể bị Mongoose/Mongo hiểu là
// toán tử truy vấn (bắt đầu bằng "$", ví dụ {"$ne": null}) hoặc key chứa "." (truy cập
// field lồng nhau), cùng các key gây prototype pollution (__proto__/constructor/prototype).
// Chỉ đụng tới KEY của object, KHÔNG động vào giá trị chuỗi ("$100", "a.b" vẫn nguyên vẹn).
// Mount toàn cục sau body parser để mọi req.body/query/params đều sạch trước khi tới service.
const AppError = require("../utils/AppError");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
// Chặn DoS lồng sâu: payload lồng quá sâu có thể làm tràn call stack khi đệ quy. Không request
// hợp lệ nào cần >32 tầng, nên vượt ngưỡng là từ chối luôn (vừa chống tràn stack vừa không tạo
// khe bypass do bỏ qua nhánh sâu). MAX_DEPTH nhỏ hơn nhiều giới hạn stack thực tế.
const MAX_DEPTH = 32;

const isPlainTarget = (val) => val !== null && typeof val === "object";

// Đệ quy làm sạch tại chỗ; xử lý cả object lẫn array (phần tử array có thể là object độc hại).
const clean = (obj, depth = 0) => {
  if (!isPlainTarget(obj)) return obj;
  if (depth > MAX_DEPTH) {
    throw new AppError(MESSAGE.INPUT_TOO_DEEP, HTTP_STATUS.BAD_REQUEST);
  }
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".") || DANGEROUS_KEYS.has(key)) {
      delete obj[key];
      continue;
    }
    clean(obj[key], depth + 1);
  }
  return obj;
};

const sanitizeMongo = (req, _res, next) => {
  try {
    clean(req.body);
    clean(req.query);
    clean(req.params);
    next();
  } catch (err) {
    next(err); // AppError lồng-quá-sâu -> error middleware trả 400
  }
};

module.exports = sanitizeMongo;

// ponytail: self-check chạy trực tiếp `node sanitizeMongo.middleware.js`
if (require.main === module) {
  const assert = require("assert");
  const payload = {
    email: "$100 ok",           // giá trị chứa $ -> giữ nguyên
    password: { $ne: null },    // operator injection -> $ne bị xoá
    "a.b": 1,                   // key chứa dot -> xoá
    __proto__: { admin: true }, // prototype pollution -> xoá
    nested: [{ $gt: "" }, { name: "x" }],
  };
  clean(payload);
  assert.strictEqual(payload.email, "$100 ok");
  assert.deepStrictEqual(payload.password, {});
  assert.ok(!("a.b" in payload));
  assert.deepStrictEqual(payload.nested, [{}, { name: "x" }]);
  assert.strictEqual({}.admin, undefined, "prototype không bị ô nhiễm");

  // Lồng sâu quá MAX_DEPTH -> ném lỗi (chống tràn stack)
  let deep = {};
  for (let i = 0; i < 100; i++) deep = { a: deep };
  assert.throws(() => clean(deep), /lồng quá sâu/);

  console.log("sanitizeMongo self-check OK");
}
