const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const roleMiddleware = require("../middlewares/role.middleware");
const promoController = require("../controllers/promo.controller");
const {
  validate,
  validateQuery,
  createPromoSchema,
  updatePromoSchema,
  listPromosQuerySchema,
  myVouchersQuerySchema,
  validatePromoSchema,
} = require("../validations/promo.validation");
const { validateObjectIdParams } = require("../validations/common.validation");

// Người dùng đã đăng nhập kiểm tra/áp dụng mã ở màn báo giá
router.post("/validate", authMiddleware, validate(validatePromoSchema), promoController.validatePromo);

// Kho mã giảm giá cá nhân của người dùng
router.get("/mine", authMiddleware, validateQuery(myVouchersQuerySchema), promoController.getMyVouchers);

// Admin CRUD mã ưu đãi
router.get("/", authMiddleware, roleMiddleware("admin"), validateQuery(listPromosQuerySchema), promoController.listPromos);
router.post("/", authMiddleware, roleMiddleware("admin"), validate(createPromoSchema), promoController.createPromo);
router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  validateObjectIdParams("id"),
  validate(updatePromoSchema),
  promoController.updatePromo
);
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  validateObjectIdParams("id"),
  promoController.deletePromo
);

module.exports = router;
