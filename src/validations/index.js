// Đăng ký export lazy một validation (chỉ require khi được dùng)
const defineLazyExport = (target, key, modulePath) => {
  Object.defineProperty(target, key, {
    enumerable: true,
    get: () => require(modulePath),
  });
};

const validations = {};

defineLazyExport(validations, "authValidation", "./auth.validation");
defineLazyExport(validations, "classValidation", "./class.validation");
defineLazyExport(validations, "tutorValidation", "./tutor.validation");
defineLazyExport(validations, "userValidation", "./user.validation");
defineLazyExport(validations, "userAdminValidation", "./userAdmin.validation");
defineLazyExport(validations, "tutorAdminValidation", "./tutorAdmin.validation");
defineLazyExport(validations, "classAdminValidation", "./classAdmin.validation");
defineLazyExport(validations, "trashAdminValidation", "./trashAdmin.validation");
defineLazyExport(validations, "classApplicationAdminValidation", "./classApplicationAdmin.validation");
defineLazyExport(validations, "cancellationAdminValidation", "./cancellationAdmin.validation");
defineLazyExport(validations, "profileChangeAdminValidation", "./profileChangeAdmin.validation");
defineLazyExport(validations, "paymentValidation", "./payment.validation");

module.exports = validations;
