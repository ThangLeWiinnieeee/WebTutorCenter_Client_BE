const { Province, District } = require("../models/location.model");

// ponytail: dữ liệu hành chính tĩnh (~63 tỉnh + vài trăm huyện) → nạp vào RAM, bỏ N+1
// findOne(code) ở TutorMapper/class.service. Tự làm mới bằng TTL (như cachedPricingConfig
// trong class.service): sau khi DB được cập nhật, cache tự nạp lại data mới trong ≤ TTL —
// không cần restart, và mỗi instance tự refresh độc lập. Cần tức thì: gọi invalidate().
const TTL_MS = 10 * 60 * 1000; // 10 phút — location đổi rất hiếm nên TTL dài là đủ tươi
let provincesByCode = null; // Map<number, {code, name, ...}>
let districtsByCode = null;
let loadedAt = 0;
let loadPromise = null;

const _load = async () => {
  const [provinces, districts] = await Promise.all([
    Province.find({}).lean(),
    District.find({}).lean(),
  ]);
  provincesByCode = new Map(provinces.map((p) => [Number(p.code), p]));
  districtsByCode = new Map(districts.map((d) => [Number(d.code), d]));
  loadedAt = Date.now();
};

// Nạp nếu chưa có hoặc đã quá TTL. Nhiều request gọi đồng thời lúc đang nạp chỉ kích hoạt
// MỘT lần nạp (giữ chung loadPromise) — tránh "cache miss đồng loạt" của bản cũ. Trong lúc
// nạp lại do hết TTL, data cũ vẫn được giữ để phục vụ đọc (không có khoảng trống null).
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

// Ép nạp lại ngay ở lần ensureLoaded kế tiếp (chỉ tác dụng trong process hiện tại).
// Dùng khi cập nhật location trong cùng tiến trình và cần tươi tức thì, không đợi hết TTL.
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
