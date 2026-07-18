const subjectRepository = require("../repositories/subject.repository");
const Tutor = require("../models/tutor.model");
const Class = require("../models/class.model");
const AppError = require("../utils/AppError");
const MESSAGE = require("../constants/message");
const HTTP_STATUS = require("../constants/status");

// Cache tên các môn đang bật — dùng cho cả validation lẫn endpoint public.
// Pattern giống cache pricing config trong class.service.js.
let cachedActiveNames = null;
let activeNamesCachedAt = 0;
const ACTIVE_NAMES_CACHE_MS = 60_000;

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
  return await subjectRepository.findAll({ keyword });
};

// Tạo môn học mới
const createSubject = async ({ name, order } = {}) => {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) throw new AppError(MESSAGE.SUBJECT_NAME_REQUIRED, HTTP_STATUS.UNPROCESSABLE_ENTITY);

  if (await subjectRepository.existsByName(trimmed)) {
    throw new AppError(MESSAGE.SUBJECT_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
  }

  const nextOrder =
    Number.isFinite(order) && order != null ? order : (await subjectRepository.maxOrder()) + 1;

  const created = await subjectRepository.create({ name: trimmed, order: nextOrder });
  clearSubjectCache();
  return created;
};

// Cập nhật môn học; khi đổi tên thì cascade cập nhật dữ liệu cũ (tutor/class)
const updateSubject = async (id, { name, isActive, order } = {}) => {
  const subject = await subjectRepository.findById(id);
  if (!subject) throw new AppError(MESSAGE.SUBJECT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

  const update = {};

  if (name !== undefined) {
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!trimmed) throw new AppError(MESSAGE.SUBJECT_NAME_REQUIRED, HTTP_STATUS.UNPROCESSABLE_ENTITY);
    if (await subjectRepository.existsByName(trimmed, id)) {
      throw new AppError(MESSAGE.SUBJECT_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }
    update.name = trimmed;
  }

  if (isActive !== undefined) update.isActive = Boolean(isActive);
  if (order !== undefined && order != null && Number.isFinite(order)) update.order = order;

  const oldName = subject.name;
  const updated = await subjectRepository.updateById(id, update);

  // Đổi tên → cascade cập nhật dữ liệu cũ để không bị mồ côi chuỗi tên.
  if (update.name && update.name !== oldName) {
    await Promise.all([
      Tutor.updateMany({ subjects: oldName }, { $set: { "subjects.$[elem]": update.name } }, {
        arrayFilters: [{ elem: oldName }],
      }),
      Class.updateMany({ subject: oldName }, { $set: { subject: update.name } }),
    ]);
  }

  clearSubjectCache();
  return updated;
};

module.exports = {
  getActiveSubjectNames,
  isValidSubjectName,
  listForAdmin,
  createSubject,
  updateSubject,
  clearSubjectCache,
};
