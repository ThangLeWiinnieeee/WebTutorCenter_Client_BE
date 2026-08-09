const express = require("express");
const router = express.Router();

const subjectController = require("../controllers/subject.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const roleMiddleware = require("../middlewares/role.middleware");
const {
  listSubjectsQuerySchema,
  createSubjectSchema,
  updateSubjectSchema,
  validate,
  validateQuery,
} = require("../validations/subject.validation");
const { validateObjectIdParams } = require("../validations/common.validation");

// Public
router.get("/", subjectController.getActiveSubjects);

// Admin
router.get(
  "/admin",
  authMiddleware,
  roleMiddleware("admin"),
  validateQuery(listSubjectsQuerySchema),
  subjectController.getAdminSubjects,
);
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  validate(createSubjectSchema),
  subjectController.createSubject,
);
router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  validateObjectIdParams("id"),
  validate(updateSubjectSchema),
  subjectController.updateSubject,
);

module.exports = router;
