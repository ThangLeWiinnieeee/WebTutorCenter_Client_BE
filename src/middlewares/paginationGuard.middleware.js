// Chặn tham số phân trang vô lý cho MỌI endpoint /api (hiện tại lẫn sau này) tại một chỗ,
// thay vì sửa từng controller. Client gửi ?limit=1000000 sẽ ép server nạp & serialize cả
// collection (chậm + DoS nhẹ) và skip khổng lồ. Middleware chỉ ép TRẦN/SÀN — KHÔNG áp default,
// để mỗi endpoint tự giữ default riêng (6, 10, 20...) qua `parseInt(req.query.limit) || N`.
//
// - limit > MAX      -> ép về MAX
// - limit không hợp lệ / < 1 -> xoá khỏi query (rơi về default của endpoint)
// - page  không hợp lệ / < 1 -> xoá khỏi query (rơi về default = 1)

const MAX_LIMIT = 100;

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
