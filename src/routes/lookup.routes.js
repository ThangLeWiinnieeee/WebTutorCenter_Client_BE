const express = require("express");
const router = express.Router();

const lookupController = require("../controllers/lookup.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const roleMiddleware = require("../middlewares/role.middleware");
const {
  createLookupSchema,
  createManyLookupsSchema,
  updateLookupSchema,
  lookupTypeParamsSchema,
  lookupProvinceParamsSchema,
  validate,
  validateParams,
} = require("../validations/lookup.validation");
const { validateObjectIdParams } = require("../validations/common.validation");

// Public routes
router.get("/all", lookupController.getAllGrouped);
router.get("/type/:type", validateParams(lookupTypeParamsSchema), lookupController.getByType);
router.get(
  "/districts/:province",
  validateParams(lookupProvinceParamsSchema),
  lookupController.getDistrictsByProvince,
);

// Admin routes (create, update, delete)
router.post("/", authMiddleware, roleMiddleware("admin"), validate(createLookupSchema), lookupController.createLookup);
router.post(
  "/bulk",
  authMiddleware,
  roleMiddleware("admin"),
  validate(createManyLookupsSchema),
  lookupController.createManyLookups,
);
router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  validateObjectIdParams("id"),
  validate(updateLookupSchema),
  lookupController.updateLookup,
);
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  validateObjectIdParams("id"),
  lookupController.deleteLookup,
);
router.delete(
  "/type/:type",
  authMiddleware,
  roleMiddleware("admin"),
  validateParams(lookupTypeParamsSchema),
  lookupController.deleteByType,
);

module.exports = router;
