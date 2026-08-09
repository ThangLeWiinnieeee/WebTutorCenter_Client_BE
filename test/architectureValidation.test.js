const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { objectIdParamsSchema } = require("../src/validations/common.validation");
const {
  activeTutorsQuerySchema,
  searchTutorsQuerySchema,
} = require("../src/validations/tutor.validation");
const { updateSubjectSchema } = require("../src/validations/subject.validation");
const { createLookupSchema } = require("../src/validations/lookup.validation");
const { listNotificationsQuerySchema } = require("../src/validations/notification.validation");
const {
  classApplicationStatsQuerySchema,
} = require("../src/validations/classApplicationAdmin.validation");

const sourceFiles = (folder) =>
  fs
    .readdirSync(path.join(__dirname, "..", "src", folder), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => ({
      name: entry.name,
      content: fs.readFileSync(path.join(__dirname, "..", "src", folder, entry.name), "utf8"),
    }));

test("ObjectId params chỉ nhận chuỗi 24 ký tự hex", () => {
  const schema = objectIdParamsSchema("id", "applicationId");
  assert.equal(
    schema.validate({ id: "507f1f77bcf86cd799439011", applicationId: "ABC" }).error !== undefined,
    true
  );
  assert.equal(
    schema.validate({
      id: "507f1f77bcf86cd799439011",
      applicationId: "507f191e810c19729de860ea",
    }).error,
    undefined
  );
});

test("query tutor được chuẩn hóa và giới hạn ngay tại validation", () => {
  const defaults = activeTutorsQuerySchema.validate({});
  assert.deepEqual(defaults.value, { page: 1, limit: 20 });
  assert.ok(activeTutorsQuerySchema.validate({ limit: 51 }).error);
  assert.ok(searchTutorsQuerySchema.validate({ page: 0 }).error);
});

test("validation subject chuyển chuỗi false thành boolean false", () => {
  const result = updateSubjectSchema.validate({ isActive: "false" });
  assert.equal(result.error, undefined);
  assert.equal(result.value.isActive, false);
});

test("lookup, notification và stats từ chối enum ngoài hợp đồng", () => {
  assert.ok(
    createLookupSchema.validate({ type: "unknown", value: "x", label: "X" }).error
  );
  assert.ok(listNotificationsQuerySchema.validate({ audience: "internal" }).error);
  assert.ok(classApplicationStatsQuerySchema.validate({ origin: "other" }).error);
});

test("controller ngoài payment không tự xử lý lỗi hoặc truy cập model", () => {
  for (const { name, content } of sourceFiles("controllers")) {
    if (name.startsWith("payment")) continue;
    assert.doesNotMatch(content, /handleError/iu, name);
    assert.doesNotMatch(content, /\.\.\/models\//u, name);
    assert.doesNotMatch(content, /new AppError/u, name);
  }
});

test("service ngoài payment chỉ truy cập DB qua repository và không nhận Express request", () => {
  for (const { name, content } of sourceFiles("services")) {
    if (name.startsWith("payment")) continue;
    assert.doesNotMatch(content, /\.\.\/models\//u, name);
    assert.doesNotMatch(content, /\breq\.[A-Za-z_$]/u, name);
    assert.doesNotMatch(content, /\bres\.[A-Za-z_$]/u, name);
  }
});
