// Đăng ký export lazy một mapper (chỉ require khi được dùng)
const defineLazyExport = (target, key, modulePath) => {
  Object.defineProperty(target, key, {
    enumerable: true,
    get: () => require(modulePath),
  });
};

const mappers = {};

defineLazyExport(mappers, "ClassMapper", "./class.mapper");
defineLazyExport(mappers, "ClassApplicationMapper", "./class.application.mapper");
defineLazyExport(mappers, "PromoMapper", "./promo.mapper");
defineLazyExport(mappers, "NotificationMapper", "./notification.mapper");
defineLazyExport(mappers, "TutorMapper", "./tutor.mapper");
defineLazyExport(mappers, "UserMapper", "./user.mapper");
defineLazyExport(mappers, "ReviewMapper", "./review.mapper");
defineLazyExport(mappers, "ProfileChangeRequestMapper", "./profileChangeRequest.mapper");
defineLazyExport(mappers, "ConversationMapper", "./conversation.mapper");
defineLazyExport(mappers, "MessageMapper", "./message.mapper");
defineLazyExport(mappers, "PaymentMapper", "./payment.mapper");
defineLazyExport(mappers, "SubjectMapper", "./subject.mapper");
defineLazyExport(mappers, "LookupMapper", "./lookup.mapper");
defineLazyExport(mappers, "LocationMapper", "./location.mapper");

module.exports = mappers;
