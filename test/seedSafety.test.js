const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { assertSeedAllowed } = require("../scripts/_seedSafety");

test("seed guard luôn chặn production", () => {
  assert.throws(
    () => assertSeedAllowed("seed", { NODE_ENV: "production", ALLOW_DESTRUCTIVE_SEED: "true" }),
    /NODE_ENV=production/,
  );
});

test("seed guard yêu cầu cờ xác nhận chính xác", () => {
  assert.throws(() => assertSeedAllowed("seed", {}), /ALLOW_DESTRUCTIVE_SEED=true/);
  assert.doesNotThrow(() =>
    assertSeedAllowed("seed", { NODE_ENV: "development", ALLOW_DESTRUCTIVE_SEED: "true" }),
  );
});

test("các seed được bảo vệ không xóa toàn bộ collection", () => {
  const scripts = [
    "seedFullDemo.js",
    "seedTutorDemoData.js",
    "seedLookups.js",
    "seedUpdateTutorFields.js",
  ];
  for (const script of scripts) {
    const source = fs.readFileSync(path.join(__dirname, "..", "scripts", script), "utf8");
    assert.doesNotMatch(source, /deleteMany\(\s*\{\s*\}\s*\)/, script);
  }
});
