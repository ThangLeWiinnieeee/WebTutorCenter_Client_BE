const express = require("express");
const classController = require("../controllers/class.controller");
const classApplicationController = require("../controllers/class.application.controller");
const { classValidation } = require("../validations");
const {
  quoteClassSchema,
  createClassSchema,
  createInviteSchema,
  updateClassSchema,
  listClassQuerySchema,
  classFeedQuerySchema,
  paginationQuerySchema,
  applicationListQuerySchema,
  cancelApplicationSchema,
  declineInvitationSchema,
  validateBody,
  validateQuery,
} = classValidation;
const { validateObjectIdParams } = require("../validations/common.validation");
const authMiddleware = require("../middlewares/auth.middleware");
const roleMiddleware = require("../middlewares/role.middleware");

const router = express.Router();

router.post("/quote", authMiddleware, validateBody(quoteClassSchema), classController.quoteClass);
router.post("/", authMiddleware, validateBody(createClassSchema), classController.createClass);
// Mời gia sư trực tiếp + gia sư phản hồi lời mời (đặt trước "/:id" để không bị nuốt route)
router.post("/invite", authMiddleware, validateBody(createInviteSchema), classController.createInvite);
router.get(
  "/invitations",
  authMiddleware,
  roleMiddleware("tutor"),
  validateQuery(applicationListQuerySchema),
  classApplicationController.getMyInvitations,
);
router.post(
  "/invitations/:applicationId/accept",
  authMiddleware,
  roleMiddleware("tutor"),
  validateObjectIdParams("applicationId"),
  classApplicationController.acceptInvitation,
);
router.post(
  "/invitations/:applicationId/decline",
  authMiddleware,
  roleMiddleware("tutor"),
  validateObjectIdParams("applicationId"),
  validateBody(declineInvitationSchema),
  classApplicationController.declineInvitation,
);
router.get("/subjects", classController.getSubjects);
router.get("/pricing-config", classController.getPricingConfig);
router.get("/", authMiddleware.optional, validateQuery(listClassQuerySchema), classController.getClasses);
router.post(
  "/:id/apply",
  authMiddleware,
  roleMiddleware("tutor"),
  validateObjectIdParams("id"),
  classApplicationController.applyForClass,
);
router.post(
  "/applications/:id/cancel",
  authMiddleware,
  roleMiddleware("tutor"),
  validateObjectIdParams("id"),
  validateBody(cancelApplicationSchema),
  classApplicationController.cancelApplication
);
// Người đăng xem danh sách gia sư ứng tuyển + chọn 1 gia sư (service tự kiểm tra quyền sở hữu)
router.get(
  "/:id/applicants",
  authMiddleware,
  validateObjectIdParams("id"),
  classApplicationController.getApplicants,
);
router.post(
  "/:id/applicants/:applicationId/select",
  authMiddleware,
  validateObjectIdParams("id", "applicationId"),
  classApplicationController.selectApplicant
);
router.get(
  "/mine",
  authMiddleware,
  roleMiddleware("tutor"),
  validateQuery(applicationListQuerySchema),
  classApplicationController.getMyApplications,
);
router.get(
  "/feed",
  authMiddleware,
  roleMiddleware("tutor"),
  validateQuery(classFeedQuerySchema),
  classController.getClassFeed,
);
router.get("/my-posts", authMiddleware, validateQuery(paginationQuerySchema), classController.getMyPosts);
// Người đăng / gia sư xác nhận hoàn thành lớp (service tự phân quyền theo người gọi)
router.post("/:id/complete", authMiddleware, validateObjectIdParams("id"), classController.completeClass);
// Chủ bài đăng sửa / xóa bài của mình (service tự kiểm tra quyền sở hữu + ràng buộc)
router.put(
  "/:id",
  authMiddleware,
  validateObjectIdParams("id"),
  validateBody(updateClassSchema),
  classController.updateClass,
);
router.delete("/:id", authMiddleware, validateObjectIdParams("id"), classController.deleteClass);
router.get("/:id", authMiddleware.optional, validateObjectIdParams("id"), classController.getClassDetail);

module.exports = router;
