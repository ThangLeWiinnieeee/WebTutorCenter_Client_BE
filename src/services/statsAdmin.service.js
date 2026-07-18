const paymentRepository = require("../repositories/payment.repository");
const classRepository = require("../repositories/class.repository");
const tutorRepository = require("../repositories/tutor.repository");

// Cửa sổ thống kê: 30 ngày gần nhất (biểu đồ ngày) + 3 tháng gần nhất (doanh thu tháng).
const DAYS = 30;
const MONTHS = 3;
const TZ_OFFSET_MS = 7 * 60 * 60 * 1000; // GMT+7
const DAY_MS = 24 * 60 * 60 * 1000;

// Danh sách khóa ngày "YYYY-MM-DD" theo giờ VN, cũ → mới (đủ N ngày, kể cả ngày không có dữ liệu).
const buildDayKeys = (days) => {
  const nowVN = new Date(Date.now() + TZ_OFFSET_MS);
  const keys = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(nowVN.getTime() - i * DAY_MS);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
};

// Danh sách khóa tháng "YYYY-MM" theo giờ VN, cũ → mới.
const buildMonthKeys = (months) => {
  const nowVN = new Date(Date.now() + TZ_OFFSET_MS);
  const keys = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(nowVN.getUTCFullYear(), nowVN.getUTCMonth() - i, 1));
    keys.push(d.toISOString().slice(0, 7));
  }
  return keys;
};

// Tổng hợp số liệu cho dashboard: doanh thu, bài đăng, gia sư mới theo ngày và tháng
const getSummary = async () => {
  const dayKeys = buildDayKeys(DAYS);
  const monthKeys = buildMonthKeys(MONTHS);
  const daySince = new Date(Date.now() - (DAYS + 1) * DAY_MS);
  const monthSince = new Date(Date.now() - (MONTHS + 1) * 31 * DAY_MS);

  const [revDay, revMonth, posts, newTutors] = await Promise.all([
    paymentRepository.aggregateRevenueByDay(daySince),
    paymentRepository.aggregateRevenueByMonth(monthSince),
    classRepository.aggregateCountByDay(daySince),
    tutorRepository.aggregateCountByDay(daySince),
  ]);

  const revDayMap = Object.fromEntries(revDay.map((r) => [r.date, r]));
  const revMonthMap = Object.fromEntries(revMonth.map((r) => [r.month, r]));
  const postsMap = Object.fromEntries(posts.map((r) => [r.date, r.count]));
  const tutorsMap = Object.fromEntries(newTutors.map((r) => [r.date, r.count]));

  const revenueDaily = dayKeys.map((k) => ({
    date: k,
    amount: revDayMap[k]?.amount || 0,
    count: revDayMap[k]?.count || 0,
  }));
  const postsDaily = dayKeys.map((k) => ({ date: k, count: postsMap[k] || 0 }));
  const newTutorsDaily = dayKeys.map((k) => ({ date: k, count: tutorsMap[k] || 0 }));
  const revenueMonthly = monthKeys.map((k) => ({
    month: k,
    amount: revMonthMap[k]?.amount || 0,
    count: revMonthMap[k]?.count || 0,
  }));

  return {
    revenueDaily,
    postsDaily,
    newTutorsDaily,
    revenueMonthly,
    totals: {
      revenue30d: revenueDaily.reduce((s, r) => s + r.amount, 0),
      paidCount30d: revenueDaily.reduce((s, r) => s + r.count, 0),
      posts30d: postsDaily.reduce((s, r) => s + r.count, 0),
      newTutors30d: newTutorsDaily.reduce((s, r) => s + r.count, 0),
    },
  };
};

module.exports = { getSummary };
