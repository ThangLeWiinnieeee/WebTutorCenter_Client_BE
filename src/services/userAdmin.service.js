const userRepository = require("../repositories/user.repository");
const AppError = require("../utils/AppError");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");
const { UserMapper } = require("../mappers");
const { buildPagination } = require("../utils/pagination");
const { diacriticInsensitiveRegex } = require("../utils/search");

// Dựng bộ lọc tìm kiếm người dùng cho admin (tên/email/điện thoại + vai trò/trạng thái)
const buildUserFilters = ({ keyword, role, isActive, isVerified }) => {
  const filters = {};
  if (keyword) {
    // Tìm không dấu + không phân biệt hoa/thường (tên/email/điện thoại)
    const pattern = diacriticInsensitiveRegex(keyword);
    filters.$or = [{ fullName: pattern }, { email: pattern }, { phone: pattern }];
  }
  if (role) filters.role = role;
  if (isActive !== undefined) filters.isActive = isActive;
  if (isVerified !== undefined) filters.isVerified = isVerified;
  return filters;
};

// Lấy danh sách người dùng cho admin (lọc + phân trang)
const getAdminUsers = async (query) => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const filters = buildUserFilters(query);
  const { users, totalItems } = await userRepository.findManyForAdmin(filters, { page, limit });
  return {
    users: UserMapper.toDTOs(users),
    pagination: buildPagination({ page, limit, totalItems }),
  };
};

// Cập nhật thông tin người dùng (admin), có kiểm soát việc cấp/thu quyền admin
const updateAdminUser = async (adminUserId, targetUserId, payload) => {
  const updateData = { fullName: payload.fullName, isVerified: payload.isVerified };
  if (payload.phone !== undefined) {
    updateData.phone = payload.phone || null;
    if (payload.phone) updateData.phoneActivated = true;
  }
  if (payload.gender !== undefined) updateData.gender = payload.gender || null;
  if (payload.dateOfBirth !== undefined) updateData.dateOfBirth = payload.dateOfBirth || null;
  // Cấp/thu quyền admin (user ↔ admin). Chặn tự đổi vai trò của chính mình để tránh
  // tự khóa quyền quản trị. Validation đã giới hạn role ∈ {admin, user}.
  if (payload.role !== undefined) {
    if (String(adminUserId) === String(targetUserId)) {
      throw new AppError(MESSAGE.ADMIN_SELF_ROLE_CHANGE, HTTP_STATUS.BAD_REQUEST);
    }
    updateData.role = payload.role;
  }
  const user = await userRepository.updateByAdmin(targetUserId, updateData);
  if (!user) throw new AppError(MESSAGE.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  return UserMapper.toDTO(user);
};

// Bật/tắt trạng thái hoạt động của tài khoản (chặn admin tự khoá mình)
const updateAdminUserStatus = async (adminUserId, targetUserId, isActive) => {
  if (String(adminUserId) === String(targetUserId) && isActive === false) {
    throw new AppError(MESSAGE.ADMIN_SELF_DEACTIVATE, HTTP_STATUS.BAD_REQUEST);
  }
  const user = await userRepository.updateStatus(targetUserId, isActive);
  if (!user) throw new AppError(MESSAGE.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  return UserMapper.toDTO(user);
};

// Xoá mềm tài khoản người dùng (chặn admin tự xoá mình)
const softDeleteAdminUser = async (adminUserId, targetUserId) => {
  if (String(adminUserId) === String(targetUserId)) {
    throw new AppError(MESSAGE.ADMIN_SELF_DELETE, HTTP_STATUS.BAD_REQUEST);
  }
  const user = await userRepository.softDeleteByAdmin(targetUserId, adminUserId);
  if (!user) throw new AppError(MESSAGE.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  return UserMapper.toDTO(user);
};

module.exports = {
  getAdminUsers,
  updateAdminUser,
  updateAdminUserStatus,
  softDeleteAdminUser,
};
