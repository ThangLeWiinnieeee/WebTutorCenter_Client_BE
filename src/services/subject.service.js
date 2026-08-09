const subjectRepository = require("../repositories/subject.repository");
const tutorRepository = require("../repositories/tutor.repository");
const classRepository = require("../repositories/class.repository");
const AppError = require("../utils/AppError");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");
const { SubjectMapper } = require("../mappers");
const { withTransaction } = require("../utils/transaction");

// Cache tên các môn đang bật — dùng cho cả validation lẫn endpoint public.
// Pattern giống cache pricing config trong class.service.js.
let cachedActiveNames = null;
let activeNamesCachedAt = 0;
const ACTIVE_NAMES_CACHE_MS = 60_000;

const translateDuplicateError = (error) => {
  if (error?.code === 11000) {
    throw new AppError(MESSAGE.SUBJECT_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
  }
  throw error;
};

// Xoá cache tên môn đang bật
const clearSubjectCache = () => {
  cachedActiveNames = null;
  activeNamesCachedAt = 0;
};

// Mảng tên môn đang bật (đã sort theo order). Có cache để tránh truy vấn mỗi request.
const getActiveSubjectNames = async () => {
  const now = Date.now();
  if (cachedActiveNames && now - activeNamesCachedAt < ACTIVE_NAMES_CACHE_MS) {
    return cachedActiveNames;
  }
  const docs = await subjectRepository.findAll({ activeOnly: true });
  cachedActiveNames = docs.map((d) => d.name);
  activeNamesCachedAt = now;
  return cachedActiveNames;
};

// Kiểm tra một tên môn có thuộc danh mục đang bật không (không phân biệt hoa/thường).
const isValidSubjectName = async (name) => {
  if (typeof name !== "string") return false;
  const target = name.trim().toLowerCase();
  const names = await getActiveSubjectNames();
  return names.some((n) => n.toLowerCase() === target);
};

// ── Admin ──
// Lấy danh sách môn học cho admin (kể cả môn đã tắt)
const listForAdmin = async ({ keyword = "" } = {}) => {
  return SubjectMapper.toDTOs(await subjectRepository.findAll({ keyword }));
};

// Tạo môn học mới
const createSubject = async ({ name, order } = {}) => {
  if (await subjectRepository.existsByName(name)) {
    throw new AppError(MESSAGE.SUBJECT_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
  }

  const nextOrder =
    Number.isFinite(order) && order != null ? order : (await subjectRepository.maxOrder()) + 1;

  try {
    const created = await subjectRepository.create({ name, order: nextOrder });
    clearSubjectCache();
    return SubjectMapper.toDTO(created);
  } catch (error) {
    return translateDuplicateError(error);
  }
};

// Cập nhật môn học; khi đổi tên thì cascade cập nhật dữ liệu cũ (tutor/class)
const updateSubject = async (id, { name, isActive, order } = {}) => {
  let updated;
  try {
    updated = await withTransaction(async (session) => {
      const subject = await subjectRepository.findById(id, { session });
      if (!subject) throw new AppError(MESSAGE.SUBJECT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

      if (name !== undefined && (await subjectRepository.existsByName(name, id, { session }))) {
        throw new AppError(MESSAGE.SUBJECT_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }

      const update = {
        ...(name !== undefined ? { name } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(order !== undefined ? { order } : {}),
      };
      const result = await subjectRepository.updateById(id, update, { session });

      if (name !== undefined && name !== subject.name) {
        await tutorRepository.renameSubject(subject.name, name, { session });
        await classRepository.renameSubject(subject.name, name, { session });
      }
      return result;
    });
  } catch (error) {
    return translateDuplicateError(error);
  }

  clearSubjectCache();
  return SubjectMapper.toDTO(updated);
};

module.exports = {
  getActiveSubjectNames,
  isValidSubjectName,
  listForAdmin,
  createSubject,
  updateSubject,
  clearSubjectCache,
};
