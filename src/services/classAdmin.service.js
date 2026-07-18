const classRepository = require("../repositories/class.repository");
const classApplicationRepository = require("../repositories/class.application.repository");
const AppError = require("../utils/AppError");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");
const { ClassMapper } = require("../mappers");
const { buildPagination } = require("../utils/pagination");
const { diacriticInsensitiveRegex } = require("../utils/search");

// Dựng bộ lọc tìm kiếm lớp cho admin (mã lớp/tiêu đề/điện thoại + môn học)
const buildClassFilters = ({ keyword, subject }) => {
  const filters = {};
  if (keyword) {
    // Tìm không dấu + không phân biệt hoa/thường (mã lớp/tiêu đề/điện thoại)
    const pattern = diacriticInsensitiveRegex(keyword);
    filters.$or = [{ classCode: pattern }, { summary: pattern }, { contactPhone: pattern }];
  }
  if (subject) filters.subject = subject;
  return filters;
};

// Gắn số đơn nhận lớp vào mỗi bài đăng để admin nắm tình hình
const attachApplicationCounts = async (dtos) => {
  const ids = dtos.map((dto) => dto.id);
  const countMap = await classApplicationRepository.countByClassIds(ids);
  return dtos.map((dto) => ({ ...dto, applicationsCount: countMap[String(dto.id)] || 0 }));
};

// Lấy danh sách lớp cho admin (lọc, phân trang, kèm số đơn nhận lớp)
const getAdminClasses = async (query = {}) => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const filters = buildClassFilters(query);
  const { classes, totalItems } = await classRepository.findManyForAdmin(filters, { page, limit });
  const dtos = await attachApplicationCounts(ClassMapper.toDTOs(classes));
  return {
    classes: dtos,
    pagination: buildPagination({ page, limit, totalItems }),
  };
};

// Lấy chi tiết một lớp kèm số đơn nhận lớp
const getAdminClassDetail = async (classId) => {
  const classItem = await classRepository.findByIdPopulated(classId);
  if (!classItem) throw new AppError(MESSAGE.CLASS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  const dto = ClassMapper.toDTO(classItem);
  const applicationsCount = await classApplicationRepository.countByClassId(classId);
  return { ...dto, applicationsCount };
};

// Xóa mềm: đưa bài đăng vào thùng rác (giữ đơn nhận lớp; chỉ xóa khi xóa vĩnh viễn)
const deleteAdminClass = async (classId, adminUserId) => {
  const deleted = await classRepository.softDelete(classId, adminUserId);
  if (!deleted) throw new AppError(MESSAGE.CLASS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  return { id: classId };
};

module.exports = {
  getAdminClasses,
  getAdminClassDetail,
  deleteAdminClass,
};
