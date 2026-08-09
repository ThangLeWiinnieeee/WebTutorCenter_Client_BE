const test = require("node:test");
const assert = require("node:assert/strict");
const promoRepository = require("../src/repositories/promo.repository");
const promoService = require("../src/services/promo.service");

test("đổi promo percent sang fixed lưu maxDiscountAmount=null", async () => {
  const originalFindById = promoRepository.findById;
  const originalUpdateById = promoRepository.updateById;
  let saved;
  const current = {
    _id: "promo-id",
    code: "SALE20",
    discountType: "percent",
    discountValue: 20,
    maxDiscountAmount: 100000,
  };
  promoRepository.findById = async () => ({ ...current, toObject: () => ({ ...current }) });
  promoRepository.updateById = async (id, data) => {
    saved = data;
    return { ...current, ...data, _id: id };
  };

  try {
    await promoService.updatePromo("promo-id", { discountType: "fixed" });
    assert.equal(saved.maxDiscountAmount, null);
  } finally {
    promoRepository.findById = originalFindById;
    promoRepository.updateById = originalUpdateById;
  }
});

test("keyword promo được escape trước khi đưa vào Mongo regex", async () => {
  const originalFindMany = promoRepository.findMany;
  let capturedFilter;
  promoRepository.findMany = async (filter) => {
    capturedFilter = filter;
    return { items: [], totalItems: 0 };
  };

  try {
    await promoService.listPromos({ keyword: "[", page: 1, limit: 10 });
    assert.equal(capturedFilter.code.$regex, "\\[");
  } finally {
    promoRepository.findMany = originalFindMany;
  }
});
