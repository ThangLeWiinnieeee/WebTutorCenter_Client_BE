const { Province, District } = require("../models/location.model");

// ponytail: dữ liệu hành chính tĩnh → nạp vào RAM (bỏ N+1 findOne), tự làm mới bằng TTL;
// cần tươi tức thì thì gọi invalidate(). Nâng cấp: dùng cache chung nếu chạy nhiều instance.
const TTL_MS = 10 * 60 * 1000; // 10 phút — location đổi rất hiếm nên TTL dài là đủ tươi
let provincesByCode = null; // Map<number, {code, name, ...}>
let districtsByCode = null;
let loadedAt = 0;
let loadPromise = null;

// Nạp toàn bộ tỉnh/huyện từ DB vào cache RAM
const _load = async () => {
  const [provinces, districts] = await Promise.all([
    Province.find({}).lean(),
    District.find({}).lean(),
  ]);
  provincesByCode = new Map(provinces.map((p) => [Number(p.code), p]));
  districtsByCode = new Map(districts.map((d) => [Number(d.code), d]));
  loadedAt = Date.now();
};

// Nạp cache nếu chưa có hoặc đã quá TTL (gộp các request đồng thời thành một lần nạp)
const ensureLoaded = async () => {
  const fresh = provincesByCode && Date.now() - loadedAt < TTL_MS;
  if (fresh) return;
  if (!loadPromise) {
    loadPromise = _load()
      .then(() => {
        loadPromise = null; // cho phép lần refresh sau
      })
      .catch((err) => {
        loadPromise = null; // nạp lỗi → cho phép thử lại ở lần gọi sau
        throw err;
      });
  }
  await loadPromise;
};

// Đọc đồng bộ từ RAM. Trả null nếu chưa nạp hoặc không tìm thấy mã.
const getProvince = (code) =>
  code == null ? null : provincesByCode?.get(Number(code)) || null;
const getDistrict = (code) =>
  code == null ? null : districtsByCode?.get(Number(code)) || null;

// Ép nạp lại cache ở lần ensureLoaded kế tiếp (làm tươi tức thì, không đợi hết TTL)
const invalidate = () => {
  provincesByCode = null;
  districtsByCode = null;
  loadedAt = 0;
  loadPromise = null;
};

module.exports = { ensureLoaded, getProvince, getDistrict, invalidate };

// Self-check (không cần DB): stub model.find rồi kiểm tra dedup nạp + coercion + invalidate.
// Chạy: node src/utils/locationCache.js
if (require.main === module) {
  const assert = require("assert");
  (async () => {
    let calls = 0;
    const stub = (rows) => () => {
      calls++;
      return { lean: async () => rows };
    };
    Province.find = stub([{ code: 1, name: "Hà Nội" }]);
    District.find = stub([{ code: 10, name: "Ba Đình" }]);

    // Gọi đồng thời 5 lần → chỉ nạp 1 lần (2 truy vấn: provinces + districts).
    await Promise.all([ensureLoaded(), ensureLoaded(), ensureLoaded(), ensureLoaded(), ensureLoaded()]);
    assert.strictEqual(calls, 2, "đồng thời phải chỉ nạp 1 lần (2 query)");

    assert.strictEqual(getProvince(1).name, "Hà Nội");
    assert.strictEqual(getProvince("1").name, "Hà Nội", "phải ép kiểu string→Number");
    assert.strictEqual(getDistrict(10).name, "Ba Đình");
    assert.strictEqual(getProvince(999), null);
    assert.strictEqual(getProvince(null), null);

    invalidate();
    assert.strictEqual(getProvince(1), null, "invalidate phải xóa cache");
    await ensureLoaded();
    assert.strictEqual(calls, 4, "sau invalidate phải nạp lại");

    console.log("locationCache self-check OK");
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
