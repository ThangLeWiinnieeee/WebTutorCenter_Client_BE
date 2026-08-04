const userRepository = require("../repositories/user.repository");
const MESSAGE = require("../constants/message");
const tutorRepository = require("../repositories/tutor.repository");
const classRepository = require("../repositories/class.repository");
const promoRepository = require("../repositories/promo.repository");
const classApplicationRepository = require("../repositories/class.application.repository");
const reviewRepository = require("../repositories/review.repository");
const conversationRepository = require("../repositories/conversation.repository");
const messageRepository = require("../repositories/message.repository");
const notificationRepository = require("../repositories/notification.repository");
const profileChangeRequestRepository = require("../repositories/profileChangeRequest.repository");
const otpRepository = require("../repositories/otp.repository");
const pendingRegistrationRepository = require("../repositories/pendingRegistration.repository");
const reviewService = require("./review.service");
const { withTransaction } = require("../utils/transaction");
const AppError = require("../utils/AppError");
const HTTP_STATUS = require("../constants/status");
const { UserMapper, ClassMapper, PromoMapper, ReviewMapper } = require("../mappers");
const { buildPagination } = require("../utils/pagination");
const { deleteImagesFromCloudinary } = require("../utils/upload");

// Xóa vĩnh viễn TẤT CẢ dữ liệu của một tài khoản khỏi DB + ảnh trên Cloudinary.
// Chỉ chạy khi xóa vĩnh viễn (purge). Xóa mềm KHÔNG đụng tới để còn khôi phục/backup.
const purgeUserData = async (user) => {
  const userId = user._id;
  const tutor = await tutorRepository.findByUserId(userId);
  const tutorId = tutor?._id;

  // 1) Thu thập dữ liệu phụ thuộc trước khi xóa.
  const classIds = await classRepository.findAllIdsByCreatedBy(userId);
  const conversation = await conversationRepository.findByTutorUserId(userId);

  // 2) Gom URL ảnh cần xóa trên Cloudinary:
  //    - avatar + (nếu là gia sư) CCCD trước/sau, thẻ SV trước/sau, bằng cấp
  //    - ảnh đính kèm trong tin nhắn: cả hội thoại của user (kèm ảnh admin gửi vào) và
  //      mọi ảnh do chính user gửi (kể cả hội thoại khác, vd khi purge tài khoản admin)
  const imageUrls = [user.avatar];
  if (tutor) {
    imageUrls.push(
      tutor.cccdFrontImage,
      tutor.cccdBackImage,
      tutor.studentCardFrontImage,
      tutor.studentCardBackImage,
      ...(tutor.certificateImages || [])
    );
  }
  if (conversation) {
    imageUrls.push(...(await messageRepository.findImageUrlsByConversationId(conversation._id)));
  }
  imageUrls.push(...(await messageRepository.findImageUrlsBySenderId(userId)));
  await deleteImagesFromCloudinary(imageUrls);

  // 3) Xóa song song các collection liên quan (độc lập nhau).
  await Promise.all([
    // Bài đăng của user + đơn nhận lớp thuộc các bài đăng đó
    classApplicationRepository.deleteByClassIds(classIds),
    classRepository.deleteAllByCreatedBy(userId),
    // Hồ sơ gia sư + đơn nhận lớp & đánh giá liên quan tới gia sư này
    ...(tutorId
      ? [
          classApplicationRepository.deleteByTutorId(tutorId),
          reviewRepository.deleteByTutorId(tutorId),
          tutorRepository.deleteByUserId(userId),
        ]
      : []),
    // Đánh giá do chính user viết (với vai trò người đăng bài)
    reviewRepository.deleteByReviewerId(userId),
    // Hội thoại + tin nhắn
    ...(conversation ? [messageRepository.deleteByConversationId(conversation._id)] : []),
    messageRepository.deleteBySenderId(userId),
    conversationRepository.deleteByTutorUserId(userId),
    // Voucher cá nhân trong "kho mã" của user (không đụng mã ưu đãi toàn cục)
    promoRepository.deleteByOwnerUserId(userId),
    // Thông báo, yêu cầu đổi hồ sơ, dữ liệu tạm theo email
    notificationRepository.deleteByUserId(userId),
    profileChangeRequestRepository.deleteByUserId(userId),
    otpRepository.deleteByEmail(user.email),
    pendingRegistrationRepository.deleteByEmail(user.email),
  ]);
};

// Đăng ký xử lý cho từng loại dữ liệu có thể nằm trong thùng rác
const TRASH_ENTITIES = {
  users: {
    label: "Người dùng",
    list: async ({ page, limit }) => {
      const { users, totalItems } = await userRepository.findDeleted({ page, limit });
      return { items: UserMapper.toDTOs(users), totalItems };
    },
    restore: (id) => userRepository.restore(id),
    // Xóa vĩnh viễn người dùng kèm TẤT CẢ dữ liệu liên quan trong DB + ảnh trên Cloudinary.
    purge: async (id) => {
      const purged = await userRepository.hardDelete(id);
      if (purged) await purgeUserData(purged);
      return purged;
    },
  },
  classes: {
    label: "Bài đăng",
    list: async ({ page, limit }) => {
      const { classes, totalItems } = await classRepository.findDeleted({ page, limit });
      return { items: ClassMapper.toDTOs(classes), totalItems };
    },
    restore: (id) => classRepository.restore(id),
    // Xóa vĩnh viễn bài đăng kèm các đơn nhận lớp liên quan
    purge: async (id) => {
      const purged = await classRepository.deleteById(id);
      if (purged) await classApplicationRepository.deleteByClassId(id);
      return purged;
    },
  },
  promos: {
    label: "Mã ưu đãi",
    list: async ({ page, limit }) => {
      const { items, totalItems } = await promoRepository.findDeleted({ page, limit });
      return { items: PromoMapper.toDTOs(items), totalItems };
    },
    restore: (id) => promoRepository.restore(id),
    purge: (id) => promoRepository.deleteById(id),
  },
  reviews: {
    label: "Đánh giá",
    list: async ({ page, limit }) => {
      const { items, totalItems } = await reviewRepository.findDeleted({ page, limit });
      return { items: ReviewMapper.toTrashDTOs(items), totalItems };
    },
    // Khôi phục đánh giá → tính lại điểm trung bình của gia sư
    restore: async (id) => {
      try {
        return await withTransaction(async (session) => {
          const restored = await reviewRepository.restore(id, { session });
          if (restored) {
            await reviewService.recomputeTutorRating(restored.tutorId, { session });
          }
          return restored;
        });
      } catch (error) {
        if (error?.code === 11000) {
          throw new AppError(MESSAGE.REVIEW_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
        }
        throw error;
      }
    },
    purge: (id) => reviewRepository.deleteById(id),
  },
};

// Lấy cấu hình xử lý theo loại dữ liệu trong thùng rác
const getTrashEntity = (type) => {
  const entity = TRASH_ENTITIES[type];
  if (!entity) throw new AppError(MESSAGE.TRASH_TYPE_INVALID, HTTP_STATUS.BAD_REQUEST);
  return entity;
};

// Lấy danh sách mục trong thùng rác theo loại (phân trang)
const getTrashItems = async (type, query = {}) => {
  const entity = getTrashEntity(type);
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const { items, totalItems } = await entity.list({ page, limit });
  return {
    type,
    items,
    pagination: buildPagination({ page, limit, totalItems }),
  };
};

// Khôi phục một mục từ thùng rác
const restoreTrashItem = async (type, id) => {
  const entity = getTrashEntity(type);
  const restored = await entity.restore(id);
  if (!restored) throw new AppError(MESSAGE.TRASH_RESTORE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  return { id };
};

// Xoá vĩnh viễn một mục trong thùng rác
const purgeTrashItem = async (type, id) => {
  const entity = getTrashEntity(type);
  const purged = await entity.purge(id);
  if (!purged) throw new AppError(MESSAGE.TRASH_PURGE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  return { id };
};

// Đếm số mục trong thùng rác theo từng loại
const getTrashCounts = async () => {
  const [users, classes, promos, reviews] = await Promise.all([
    userRepository.findDeleted({ page: 1, limit: 1 }),
    classRepository.findDeleted({ page: 1, limit: 1 }),
    promoRepository.findDeleted({ page: 1, limit: 1 }),
    reviewRepository.findDeleted({ page: 1, limit: 1 }),
  ]);
  return {
    users: users.totalItems,
    classes: classes.totalItems,
    promos: promos.totalItems,
    reviews: reviews.totalItems,
  };
};

module.exports = {
  getTrashItems,
  restoreTrashItem,
  purgeTrashItem,
  getTrashCounts,
};
