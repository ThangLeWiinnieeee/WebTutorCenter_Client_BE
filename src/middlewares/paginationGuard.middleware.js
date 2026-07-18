const MAX_LIMIT = 100;

// Ép trần/sàn cho tham số phân trang (limit/page) trên mọi endpoint /api — không áp default
const paginationGuard = (req, _res, next) => {
  const q = req.query;

  if (q.limit !== undefined) {
    const n = parseInt(q.limit, 10);
    if (Number.isNaN(n) || n < 1) delete q.limit;
    else if (n > MAX_LIMIT) q.limit = String(MAX_LIMIT);
  }

  if (q.page !== undefined) {
    const p = parseInt(q.page, 10);
    if (Number.isNaN(p) || p < 1) delete q.page;
  }

  next();
};

module.exports = paginationGuard;
module.exports.MAX_LIMIT = MAX_LIMIT;
