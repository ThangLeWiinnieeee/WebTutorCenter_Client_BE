const express = require("express");
const router = express.Router();

const locationController = require("../controllers/location.controller");
const {
  provinceCodeParamsSchema,
  schoolSearchQuerySchema,
  validateParams,
  validateQuery,
} = require("../validations/location.validation");

router.get("/provinces", locationController.getProvinces);
router.get(
  "/provinces/:provinceCode/districts",
  validateParams(provinceCodeParamsSchema),
  locationController.getDistricts,
);
router.get("/schools", validateQuery(schoolSearchQuerySchema), locationController.getSchools);

module.exports = router;
