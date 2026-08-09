const AppError = require("../utils/AppError");
const HTTP_STATUS = require("../constants/status");
const locationRepository = require("../repositories/location.repository");
const locationCache = require("../utils/locationCache");
const classRepository = require("../repositories/class.repository");
const tutorRepository = require("../repositories/tutor.repository");
const userRepository = require("../repositories/user.repository");
const classApplicationRepository = require("../repositories/class.application.repository");
const classViewRepository = require("../repositories/class.view.repository");
const reviewRepository = require("../repositories/review.repository");
const OCCUPATION_STATUS = require("../constants/occupationStatus");
const { ClassMapper, ClassApplicationMapper } = require("../mappers");
const MESSAGE = require("../constants/message");
const subjectService = require("./subject.service");
const classPricingRepository = require("../repositories/class.pricing.repository");
const promoService = require("./promo.service");
const promoRepository = require("../repositories/promo.repository");
const outboxService = require("./outbox.service");
const { CLASS_STATUS } = require("../constants/class");
const { NOTIFICATION_TYPES } = require("../constants/notification");
const {
  CLASS_APPLICATION_STATUS,
  CLASS_APPLICATION_ORIGIN,
} = require("../constants/classApplication");
const { TUTOR_STATUS, SUBJECT_AFFINITY } = require("../constants/tutor");
const { buildPagination } = require("../utils/pagination");
const { generateUniqueCode } = require("../utils/code");
const { withTransaction } = require("../utils/transaction");

let cachedPricingConfig = null;
let pricingConfigCachedAt = 0;
const PRICING_CONFIG_CACHE_MS = 60_000;

// Lấy cấu hình bảng giá mặc định (có cache 60s)
const loadPricingConfigDoc = async () => {
  const now = Date.now();
  if (cachedPricingConfig && now - pricingConfigCachedAt < PRICING_CONFIG_CACHE_MS) {
    return cachedPricingConfig;
  }

  const doc = await classPricingRepository.findDefault();
  if (!doc) {
    throw new AppError(MESSAGE.PRICING_CONFIG_MISSING, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  cachedPricingConfig = doc;
  pricingConfigCachedAt = now;
  return doc;
};

// Chuyển danh sách phí theo môn thành map { môn: phí }
const mapBaseFeeBySubject = (baseFeeBySubject = []) => {
  const map = {};
  for (const item of baseFeeBySubject) {
    if (item?.subject) map[item.subject] = item.fee;
  }
  return map;
};

// Chuẩn hoá cấu hình bảng giá để trả về cho FE
const toPricingConfigResponse = (doc) => {
  const minutesPerSessionOptions = [...(doc.minutesPerSessionOptions || [])].sort((a, b) => a - b);
  const defaultMinutesPerSession = minutesPerSessionOptions.includes(doc.sessionLengthBaseMinutes)
    ? doc.sessionLengthBaseMinutes
    : minutesPerSessionOptions[0] ?? doc.sessionLengthBaseMinutes;

  return {
    defaultBaseFee: doc.defaultBaseFee,
    studentCountSurcharge: doc.studentCountSurcharge,
    sessionLengthBaseMinutes: doc.sessionLengthBaseMinutes,
    minutesPerSessionOptions,
    defaultMinutesPerSession,
    sessionsPerWeekMin: doc.sessionsPerWeekMin,
    sessionsPerWeekMax: doc.sessionsPerWeekMax,
    baseFeeBySubject: mapBaseFeeBySubject(doc.baseFeeBySubject),
  };
};

// Kiểm tra tham số tính giá hợp lệ (thời lượng buổi, số buổi/tuần)
const ensurePricingInputValid = (payload, configDoc) => {
  const options = configDoc.minutesPerSessionOptions || [];
  if (!options.includes(payload.minutesPerSession)) {
    throw new AppError(
      `Thời lượng mỗi buổi phải là một trong: ${options.join(", ")} phút`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  if (
    payload.sessionsPerWeek < configDoc.sessionsPerWeekMin ||
    payload.sessionsPerWeek > configDoc.sessionsPerWeekMax
  ) {
    throw new AppError(
      `Số buổi/tuần phải từ ${configDoc.sessionsPerWeekMin} đến ${configDoc.sessionsPerWeekMax}`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }
};

// Sinh mã lớp ngẫu nhiên không trùng
const generateClassCode = () =>
  generateUniqueCode({
    generate: () => String(Math.floor(10000 + Math.random() * 90000)),
    exists: (classCode) => classRepository.findByClassCode(classCode),
    errorMessage: "Không thể tạo mã lớp, vui lòng thử lại",
  });

// Kiểm tra tỉnh/huyện hợp lệ và khớp nhau
const ensureLocationValid = async (provinceCode, districtCode) => {
  const [province, district] = await Promise.all([
    locationRepository.findProvinceByCode(provinceCode),
    locationRepository.findDistrictByCode(districtCode),
  ]);

  if (!province || !district || district.provinceCode !== provinceCode) {
    throw new AppError(MESSAGE.INVALID_AREA, HTTP_STATUS.BAD_REQUEST);
  }
};

// Tính học phí mỗi buổi và mỗi tháng theo cấu hình
const calculateFee = (payload, configDoc) => {
  const feeMap = mapBaseFeeBySubject(configDoc.baseFeeBySubject);
  const baseFee = feeMap[payload.subject] ?? configDoc.defaultBaseFee;
  const durationFactor = payload.minutesPerSession / configDoc.sessionLengthBaseMinutes;
  const studentSurcharge = Math.max(0, payload.studentCount - 1) * configDoc.studentCountSurcharge;
  const feePerSession = Math.round(baseFee * durationFactor + studentSurcharge);
  const feePerMonth = feePerSession * payload.sessionsPerWeek * 4;
  return { feePerSession, feePerMonth };
};

const MIN_START_LEAD_DAYS = 2;
// Kiểm tra ngày bắt đầu lớp cách hôm nay tối thiểu 2 ngày
const ensureStartDateLeadTime = (startDate) => {
  const picked = new Date(startDate);
  const minStart = new Date();
  minStart.setUTCHours(0, 0, 0, 0);
  minStart.setUTCDate(minStart.getUTCDate() + MIN_START_LEAD_DAYS);
  if (Number.isNaN(picked.getTime()) || picked.getTime() < minStart.getTime()) {
    throw new AppError(MESSAGE.CLASS_START_DATE_TOO_SOON, HTTP_STATUS.BAD_REQUEST);
  }
};

// Dựng dữ liệu lớp từ payload (validate khu vực, tính giá, áp mã ưu đãi)
const buildClassData = async (payload, userId) => {
  ensureStartDateLeadTime(payload.startDate);
  const [province, district] = await Promise.all([
    locationRepository.findProvinceByCode(payload.provinceCode),
    locationRepository.findDistrictByCode(payload.districtCode),
  ]);

  if (!province || !district || district.provinceCode !== payload.provinceCode) {
    throw new AppError(MESSAGE.INVALID_AREA, HTTP_STATUS.BAD_REQUEST);
  }

  const configDoc = await loadPricingConfigDoc();
  ensurePricingInputValid(payload, configDoc);
  const pricing = calculateFee(payload, configDoc);
  const classCode = await generateClassCode();

  // Áp mã ưu đãi (nếu có) lên học phí/tháng — re-validate phía server để không tin client
  let promoCode = null;
  let promoDiscount = 0;
  let finalFeePerMonth = pricing.feePerMonth;
  let promoDoc = null;
  if (payload.promoCode) {
    const result = await promoService.evaluatePromo(payload.promoCode, pricing.feePerMonth, userId);
    promoDoc = result.promo;
    promoCode = result.promo.code;
    promoDiscount = result.discountAmount;
    finalFeePerMonth = result.finalAmount;
  }

  const data = {
    ...payload,
    promoCode,
    promoDiscount,
    classCode,
    provinceName: province.name,
    districtName: district.name,
    createdBy: userId,
    ...pricing,
    finalFeePerMonth,
  };

  return { data, promoDoc };
};

// Báo giá học phí cho lớp theo tham số đầu vào
const quoteClass = async (payload) => {
  await ensureLocationValid(payload.provinceCode, payload.districtCode);
  const configDoc = await loadPricingConfigDoc();
  ensurePricingInputValid(payload, configDoc);
  return calculateFee(payload, configDoc);
};

// Kiểm tra người dùng có quyền xem thông tin nhạy cảm của lớp (SĐT/địa chỉ chi tiết)
const checkCanViewSensitiveDetails = async (classItem, user) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  const createdById = classItem.createdBy?._id || classItem.createdBy;
  if (createdById && createdById.toString() === user.id) return true;

  // Check if user is a tutor with an approved application for this class.
  // Luồng mới: phải đã THANH TOÁN phí nhận lớp (feePaid) mới được xem SĐT/địa chỉ chi tiết —
  // chặn gia sư mở /classes/:id để né bước thanh toán.
  const tutor = await tutorRepository.findByUserId(user.id);
  if (tutor) {
    const approvedApp = await classApplicationRepository.findByClassAndTutor(classItem._id || classItem.id, tutor._id);
    if (approvedApp && approvedApp.status === "approved" && approvedApp.feePaid) return true;
  }

  return false;
};

// Chặn người ngoài mở chi tiết lớp đã bị khoá (đã chọn/ghép gia sư); chỉ người đăng, admin, gia sư tham gia được xem
const ensureCanViewLockedClass = async (classItem, user) => {
  const lockingApplication = await classApplicationRepository.findLockingByClassId(classItem._id);
  if (!lockingApplication) return;

  if (user?.role === "admin") return;
  const createdById = classItem.createdBy?._id || classItem.createdBy;
  if (user && createdById && String(createdById) === String(user.id)) return;

  if (user) {
    const tutor = await tutorRepository.findByUserId(user.id);
    if (tutor && (await classApplicationRepository.findByClassAndTutor(classItem._id, tutor._id))) {
      return;
    }
  }

  throw new AppError(MESSAGE.CLASS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
};

// Ẩn thông tin liên hệ nhạy cảm của lớp với người không có quyền xem
const maskClassItem = async (classItem, user) => {
  const isArray = Array.isArray(classItem);
  const items = isArray ? classItem : [classItem];
  const maskedList = [];

  await locationCache.ensureLoaded(); // nạp 1 lần cho cả list; fallback bên dưới đọc từ RAM

  for (const item of items) {
    const dto = ClassMapper.toDTO(item);
    if (!dto) {
      maskedList.push(null);
      continue;
    }

    // Fallback tên tỉnh/huyện cho document cũ (chưa denormalize) — đọc từ cache, không query.
    if (!dto.provinceName || !dto.districtName) {
      dto.provinceName = locationCache.getProvince(dto.provinceCode)?.name || "";
      dto.districtName = locationCache.getDistrict(dto.districtCode)?.name || "";
    }

    const canView = await checkCanViewSensitiveDetails(item, user);
    if (!canView) {
      dto.contactPhone = null;
      dto.locationLabel = `${dto.districtName}, ${dto.provinceName}`;
    }
    maskedList.push(dto);
  }

  return isArray ? maskedList : maskedList[0];
};

// Tạo bài đăng tìm gia sư (validate môn, tạo lớp, cập nhật lượt dùng mã ưu đãi)
const createClass = async (payload, userId) => {
  // Môn học phải thuộc danh mục đang bật (nguồn DB, không còn fix cứng)
  if (!(await subjectService.isValidSubjectName(payload.subject))) {
    throw new AppError(MESSAGE.SUBJECT_NOT_FOUND, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }
  const { data, promoDoc } = await buildClassData(payload, userId);
  const created = await withTransaction(async (session) => {
    const classItem = await classRepository.create(data, { session });
    if (promoDoc?._id && !(await promoRepository.incrementUsed(promoDoc._id, {
      session,
      expectedUpdatedAt: promoDoc.updatedAt,
    }))) {
      throw new AppError(MESSAGE.PROMO_USAGE_EXCEEDED, HTTP_STATUS.CONFLICT);
    }
    return classItem;
  });
  return await maskClassItem(created, { id: userId });
};

// Người đăng mời một gia sư cụ thể dạy lớp (tạo lớp ẩn + đơn mời + thông báo gia sư)
const createInvitedClass = async (payload, userId) => {
  const { requestedTutorId, ...classPayload } = payload;

  if (!(await subjectService.isValidSubjectName(classPayload.subject))) {
    throw new AppError(MESSAGE.SUBJECT_NOT_FOUND, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }

  const tutor = await tutorRepository.findById(requestedTutorId);
  if (!tutor) throw new AppError(MESSAGE.CLASS_INVITE_TUTOR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  if (tutor.status !== TUTOR_STATUS.APPROVED) {
    throw new AppError(MESSAGE.CLASS_INVITE_TUTOR_NOT_APPROVED, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }

  const tutorUser = tutor.userId || {};
  const tutorUserId = tutorUser._id ?? tutor.userId;
  if (String(tutorUserId) === String(userId)) {
    throw new AppError(MESSAGE.CLASS_INVITE_OWN, HTTP_STATUS.FORBIDDEN);
  }

  // Re-validate (không tin client): mọi ràng buộc phải khớp hồ sơ gia sư
  if (!Array.isArray(tutor.subjects) || !tutor.subjects.includes(classPayload.subject)) {
    throw new AppError(MESSAGE.CLASS_INVITE_SUBJECT_MISMATCH, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }

  const teachingProvince = tutor.teachingAreas?.province;
  const teachingDistricts = tutor.teachingAreas?.districts || [];
  if (
    Number(classPayload.provinceCode) !== Number(teachingProvince) ||
    !teachingDistricts.map(Number).includes(Number(classPayload.districtCode))
  ) {
    throw new AppError(MESSAGE.CLASS_INVITE_AREA_MISMATCH, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }

  const tutorSlotKeys = new Set((tutor.availability || []).map((s) => `${s.day}-${s.hour}`));
  const allSlotsAllowed = (classPayload.availabilitySlots || []).every((s) =>
    tutorSlotKeys.has(`${s.day}-${s.hour}`),
  );
  if (!allSlotsAllowed) {
    throw new AppError(MESSAGE.CLASS_INVITE_SLOT_MISMATCH, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }

  const expectedGenderPref = tutorUser.gender || "any";
  const expectedLevelPref = OCCUPATION_TO_LEVEL[tutor.occupationStatus] || "any";
  if (
    classPayload.tutorGenderPref !== expectedGenderPref ||
    classPayload.tutorLevelPref !== expectedLevelPref
  ) {
    throw new AppError(MESSAGE.CLASS_INVITE_PREF_MISMATCH, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }

  const { data, promoDoc } = await buildClassData(classPayload, userId);
  data.requestedTutorId = tutor._id;
  const created = await withTransaction(async (session) => {
    const classItem = await classRepository.create(data, { session });
    if (promoDoc?._id && !(await promoRepository.incrementUsed(promoDoc._id, {
      session,
      expectedUpdatedAt: promoDoc.updatedAt,
    }))) {
      throw new AppError(MESSAGE.PROMO_USAGE_EXCEEDED, HTTP_STATUS.CONFLICT);
    }
    const invitation = await classApplicationRepository.create(
      {
        classId: classItem._id,
        tutorId: tutor._id,
        origin: CLASS_APPLICATION_ORIGIN.INVITE,
        status: CLASS_APPLICATION_STATUS.INVITED,
      },
      { session },
    );
    await outboxService.enqueueNotification({
      dedupeKey: `class-invite:${invitation._id}:received`,
      userId: tutorUserId,
      type: NOTIFICATION_TYPES.CLASS_INVITE_RECEIVED,
      message: `Có người yêu cầu bạn dạy lớp ${classItem.classCode} - Môn: ${classItem.subject}. Vào "Lời mời dạy lớp" để xem và phản hồi.`,
    }, { session });
    return classItem;
  });

  return await maskClassItem(created, { id: userId });
};

// Chuẩn hoá tên môn dùng để lọc theo danh mục đang bật
const normalizeSubjectFilter = (subject, names = []) => {
  if (!subject) return "";
  const normalized = subject.trim().toLowerCase();
  const matchedSubject = names.find((item) => item.toLowerCase() === normalized);
  return matchedSubject || subject.trim();
};

// Lấy danh sách lớp công khai (lọc, phân trang, ẩn lớp đã khoá)
const getClasses = async (query, user) => {
  const filters = {};
  if (query.subject) {
    const activeNames = await subjectService.getActiveSubjectNames();
    filters.subject = normalizeSubjectFilter(query.subject, activeNames);
  }
  if (query.provinceCode) filters.provinceCode = query.provinceCode;
  if (query.districtCode) filters.districtCode = query.districtCode;

  const { page = 1, limit = 6 } = query;
  // Ẩn các lớp đã "khóa" (đơn selected/approved/cancel_requested — người đăng đã chọn gia sư,
  // đã ghép, hoặc đang xin hủy) khỏi danh sách công khai, đồng bộ với feed "Lớp mới theo môn".
  // Lưu ý: đơn pending (mới ứng tuyển, chưa được chọn) KHÔNG khóa — lớp vẫn hiển thị để nhận thêm.
  // Nhưng gia sư đã ấn nhận lớp thì không thấy lại lớp đó nữa (giống feed "Lớp mới theo môn").
  const tutor = user?.id ? await tutorRepository.findByUserId(user.id) : null;
  const [lockedIds, myAppliedIds] = await Promise.all([
    classApplicationRepository.distinctActiveClassIds(),
    tutor ? classApplicationRepository.distinctClassIdsByTutor(tutor._id) : [],
  ]);
  const excludeIds = [...new Set([...lockedIds, ...myAppliedIds].map(String))];
  const { classes, totalItems } = await classRepository.findMany(filters, { page, limit, excludeIds });

  const maskedClasses = await maskClassItem(classes, user);
  return {
    classes: maskedClasses,
    pagination: buildPagination({ page, limit, totalItems }),
  };
};

const FEED_NEW_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 giờ

// Map tình trạng nghề nghiệp của gia sư → mức trình độ mà bài đăng yêu cầu (student/teacher).
// Bài đăng chỉ có 2 mức cụ thể (student/teacher) ngoài "any"; người đã tốt nghiệp xếp nhóm "teacher".
const OCCUPATION_TO_LEVEL = {
  [OCCUPATION_STATUS.STUDENT]: "student",
  [OCCUPATION_STATUS.GRADUATED]: "teacher",
  [OCCUPATION_STATUS.TEACHER]: "teacher",
};

// Tính tiêu chí cá nhân hoá của gia sư để lọc feed (giới tính, trình độ, khu vực)
const buildTutorFeedCriteria = (tutor, user) => {
  const gender = user?.gender;
  const genderPrefs = gender === "male" || gender === "female" ? [gender, "any"] : ["any"];

  const level = OCCUPATION_TO_LEVEL[tutor?.occupationStatus] || null;
  const levelPrefs = level ? [level, "any"] : ["any"];

  const provinceCode = tutor?.teachingAreas?.province ?? null;

  return { genderPrefs, levelPrefs, provinceCode, gender: gender || null, level };
};

// Lấy feed bài đăng phù hợp cho gia sư (cá nhân hoá theo môn/giới tính/trình độ/khu vực)
const getClassFeedForTutor = async (userId, query = {}) => {
  const [tutor, user] = await Promise.all([
    tutorRepository.findByUserId(userId),
    userRepository.findById(userId),
  ]);
  if (!tutor) throw new AppError(MESSAGE.TUTOR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

  const subjects = Array.isArray(tutor.subjects) ? tutor.subjects : [];
  const { page = 1, limit = 10 } = query;

  const { genderPrefs, levelPrefs, provinceCode, gender, level } = buildTutorFeedCriteria(tutor, user);

  // Thông tin cá nhân hóa để FE hiển thị (tỉnh dạy, giới tính, trình độ đã dùng để lọc)
  const province = provinceCode != null ? await locationRepository.findProvinceByCode(provinceCode) : null;
  const personalization = {
    gender,
    level,
    provinceCode,
    provinceName: province?.name || null,
  };

  const emptyPagination = buildPagination({ page, limit, totalItems: 0 });

  if (subjects.length === 0) {
    return { classes: [], subjects: [], newCount: 0, personalization, pagination: emptyPagination };
  }

  // Cho phép lọc theo 1 môn cụ thể, nhưng môn đó phải nằm trong các môn gia sư dạy
  const subjectFilter = query.subject && subjects.includes(query.subject) ? query.subject : null;
  const filterSubjects = subjectFilter ? [subjectFilter] : subjects;

  // Lọc/search theo môn = tín hiệu quan tâm → cộng điểm. Chống spam: chỉ tính nếu môn này chưa
  // được tương tác trong FILTER_THROTTLE_MS gần đây. Mốc `t` lưu theo TỪNG môn nên lọc qua lại
  // giữa các môn vẫn giữ nguyên cửa sổ 60s của mỗi môn. Best-effort, không chặn luồng đọc feed.
  if (subjectFilter) {
    const entry = tutor.subjectAffinity?.get?.(subjectFilter);
    const throttled = entry && Date.now() - entry.t < SUBJECT_AFFINITY.FILTER_THROTTLE_MS;
    if (!throttled) {
      tutorRepository
        .incrementSubjectAffinity(userId, subjectFilter, SUBJECT_AFFINITY.WEIGHT.FILTER)
        .catch(() => {});
    }
  }

  const baseCriteria = { genderPrefs, levelPrefs, provinceCode };

  // Ẩn các bài đã "khóa" (đã chọn/đã ghép) và các bài chính gia sư này đã ứng tuyển
  // (để không ứng tuyển lại lớp đang chờ). Bài chỉ có ứng viên đang chờ vẫn hiển thị cho người khác.
  const [lockedIds, myAppliedIds] = await Promise.all([
    classApplicationRepository.distinctActiveClassIds(),
    classApplicationRepository.distinctClassIdsByTutor(tutor._id),
  ]);
  const excludeIds = [...new Set([...lockedIds, ...myAppliedIds].map(String))];
  const since = new Date(Date.now() - FEED_NEW_WINDOW_MS);
  // Điểm quan tâm theo môn (đã suy giảm theo thời gian) → đẩy môn tương tác nhiều & gần đây lên đầu feed
  const affinity = tutorRepository.decayAffinityMap(tutor.subjectAffinity);
  const [{ classes, totalItems }, newCount] = await Promise.all([
    classRepository.findByFeedCriteria(
      { ...baseCriteria, subjects: filterSubjects },
      { page, limit, excludeIds, affinity },
    ),
    classRepository.countByFeedCriteriaSince({ ...baseCriteria, subjects }, since, excludeIds),
  ]);

  const maskedClasses = await maskClassItem(classes, { id: userId, role: "tutor" });
  return {
    classes: maskedClasses,
    subjects,
    newCount,
    personalization,
    pagination: buildPagination({ page, limit, totalItems }),
  };
};

// Lấy danh sách bài đăng của người dùng kèm trạng thái đơn và gia sư đã ghép
const getMyPostedClasses = async (userId, query = {}) => {
  const { page = 1, limit = 10 } = query;
  const { classes, totalItems } = await classRepository.findByCreatedBy(userId, { page, limit });

  // Đánh dấu bài đăng đã có đơn đang hoạt động (gồm cả ứng viên đang chờ) → FE ẩn nút sửa/xóa
  // cho khớp với ràng buộc backend (countActiveByClassId).
  const classIds = classes.map((c) => c._id);
  const [activeIds, applicantCounts, approvedApps, reviewedIds, inviteApps] = await Promise.all([
    classApplicationRepository
      .distinctClassIdsWithActiveApplications()
      .then((ids) => new Set(ids.map(String))),
    classApplicationRepository.countActiveApplicantsByClassIds(classIds),
    // Gia sư đã được admin duyệt cho từng bài đăng (lớp đã ghép) → hiển thị trong "Bài đăng của tôi"
    classApplicationRepository.findApprovedByClassIds(classIds),
    // Các lớp người đăng đã đánh giá gia sư → ẩn nút "Đánh giá gia sư"
    reviewRepository.findReviewedClassIds(userId, classIds).then((ids) => new Set(ids.map(String))),
    // Đơn mời gia sư trực tiếp (origin=invite) → hiển thị kết quả mời (đồng ý/từ chối + lý do)
    classApplicationRepository.findInviteByClassIds(classIds),
  ]);
  // Map { classId: thông tin gia sư đã ghép (kèm SĐT) } để gắn vào từng bài đăng
  const matchedTutorByClassId = approvedApps.reduce((acc, app) => {
    const tutor = ClassApplicationMapper.toMatchedTutorDTO(app);
    if (tutor) acc[String(app.classId)] = tutor;
    return acc;
  }, {});
  // Map { classId: thông tin gia sư được mời + trạng thái lời mời }
  const invitedTutorByClassId = inviteApps.reduce((acc, app) => {
    const dto = ClassApplicationMapper.toInvitedTutorDTO(app);
    if (dto) acc[String(app.classId)] = dto;
    return acc;
  }, {});
  const maskedClasses = await maskClassItem(classes, { id: userId });
  maskedClasses.forEach((item) => {
    if (item) {
      item.hasActiveApplications = activeIds.has(String(item.id));
      // Số gia sư đang ứng tuyển (chờ chọn / đã chọn) → cho nút "Gia sư ứng tuyển (N)"
      item.applicantCount = applicantCounts[String(item.id)] || 0;
      // Gia sư đã được admin duyệt nhận lớp (null nếu lớp chưa ghép)
      item.matchedTutor = matchedTutorByClassId[String(item.id)] || null;
      // Người đăng đã đánh giá gia sư của lớp này chưa (chỉ ý nghĩa khi lớp đã hoàn thành)
      item.reviewed = reviewedIds.has(String(item.id));
      // Lớp mời gia sư trực tiếp: gia sư được mời + trạng thái lời mời (đồng ý/từ chối + lý do)
      item.invitedTutor = invitedTutorByClassId[String(item.id)] || null;
    }
  });
  return {
    classes: maskedClasses,
    pagination: buildPagination({ page, limit, totalItems }),
  };
};

// Chủ bài đăng sửa bài của mình — chỉ khi đang mở và chưa có gia sư ứng tuyển.
const updatePostedClass = async (classId, userId, payload) => {
  const classItem = await classRepository.findById(classId);
  if (!classItem) throw new AppError(MESSAGE.CLASS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

  const ownerId = classItem.createdBy?._id ?? classItem.createdBy;
  if (String(ownerId) !== String(userId)) {
    throw new AppError(MESSAGE.CLASS_EDIT_FORBIDDEN, HTTP_STATUS.FORBIDDEN);
  }
  if (classItem.status !== CLASS_STATUS.OPEN) {
    throw new AppError(MESSAGE.CLASS_EDIT_ONLY_OPEN, HTTP_STATUS.BAD_REQUEST);
  }
  const activeCount = await classApplicationRepository.countActiveByClassId(classId);
  if (activeCount > 0) {
    throw new AppError(MESSAGE.CLASS_EDIT_HAS_APPLICANTS, HTTP_STATUS.BAD_REQUEST);
  }

  ensureStartDateLeadTime(payload.startDate);

  // Validate khu vực + tính lại học phí theo thông tin mới
  const [province, district] = await Promise.all([
    locationRepository.findProvinceByCode(payload.provinceCode),
    locationRepository.findDistrictByCode(payload.districtCode),
  ]);
  if (!province || !district || district.provinceCode !== payload.provinceCode) {
    throw new AppError(MESSAGE.INVALID_AREA, HTTP_STATUS.BAD_REQUEST);
  }
  const configDoc = await loadPricingConfigDoc();
  ensurePricingInputValid(payload, configDoc);
  const pricing = calculateFee(payload, configDoc);

  // Giữ nguyên mã ưu đãi ban đầu (không cho đổi khi sửa); tính lại số tiền giảm theo học phí mới
  let promoDiscount = 0;
  let finalFeePerMonth = pricing.feePerMonth;
  const promoCode = classItem.promoCode || null;
  if (promoCode) {
    const promo = await promoRepository.findByCode(promoCode);
    if (promo) {
      promoDiscount = promoService.computeDiscount(promo, pricing.feePerMonth);
      finalFeePerMonth = Math.max(0, pricing.feePerMonth - promoDiscount);
    }
  }

  const editable = { ...payload };
  delete editable.promoCode; // không cho sửa mã ưu đãi qua chức năng sửa bài

  const data = {
    ...editable,
    provinceName: province.name,
    districtName: district.name,
    ...pricing,
    promoCode,
    promoDiscount,
    finalFeePerMonth,
  };
  const updated = await classRepository.update(classId, data);
  return await maskClassItem(updated, { id: userId });
};

// Chủ bài đăng xóa VĨNH VIỄN bài của mình — chỉ khi chưa có đơn nào đang hoạt động.
const deletePostedClass = async (classId, userId) => {
  const classItem = await classRepository.findById(classId);
  if (!classItem) throw new AppError(MESSAGE.CLASS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

  const ownerId = classItem.createdBy?._id ?? classItem.createdBy;
  if (String(ownerId) !== String(userId)) {
    throw new AppError(MESSAGE.CLASS_DELETE_FORBIDDEN, HTTP_STATUS.FORBIDDEN);
  }
  const activeCount = await classApplicationRepository.countActiveByClassId(classId);
  if (activeCount > 0) {
    throw new AppError(MESSAGE.CLASS_DELETE_HAS_APPLICANTS, HTTP_STATUS.BAD_REQUEST);
  }
  // Xóa hẳn khỏi DB kèm các đơn nhận lớp liên quan (không đưa vào thùng rác)
  await classApplicationRepository.deleteByClassId(classId);
  await classRepository.hardDelete(classId);
  return { id: classId };
};

// Lấy chi tiết một lớp (kiểm tra quyền xem, ghi tín hiệu quan tâm, kèm gia sư đã ghép)
const getClassById = async (id, user) => {
  const classItem = await classRepository.findById(id);
  if (!classItem) {
    throw new AppError(MESSAGE.CLASS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  // Lớp đã có gia sư được chọn/ghép → chặn người ngoài mở chi tiết bằng URL trực tiếp
  await ensureCanViewLockedClass(classItem, user);

  // Gia sư mở chi tiết → cộng điểm quan tâm với môn của lớp (feed cá nhân hóa). Chỉ tính LẦN
  // XEM ĐẦU TIÊN mỗi lớp (recordFirstView) để mở đi mở lại cùng lớp không spam điểm. Best-effort:
  // tín hiệu phụ, không được để nó làm hỏng việc xem chi tiết nếu ghi thất bại.
  if (user?.role === "tutor" && classItem.subject) {
    classViewRepository
      .recordFirstView(user.id, classItem._id)
      .then((isFirstView) => {
        if (isFirstView) {
          return tutorRepository.incrementSubjectAffinity(
            user.id,
            classItem.subject,
            SUBJECT_AFFINITY.WEIGHT.VIEW,
          );
        }
      })
      .catch(() => {});
  }

  const dto = await maskClassItem(classItem, user);

  // Người đăng (chủ bài) hoặc admin xem bài đã ghép → kèm thông tin + SĐT gia sư đã nhận lớp.
  // Người khác (khách, gia sư) không thấy để tránh lộ liên hệ riêng tư của gia sư.
  if (dto) {
    const createdById = classItem.createdBy?._id || classItem.createdBy;
    const isOwner = user && createdById && String(createdById) === String(user.id);
    const isAdmin = user?.role === "admin";
    if (isOwner || isAdmin) {
      const approvedApp = await classApplicationRepository.findApprovedByClassId(classItem._id);
      dto.matchedTutor = approvedApp ? ClassApplicationMapper.toMatchedTutorDTO(approvedApp) : null;
    }
  }
  return dto;
};

// Người đăng / gia sư xác nhận đã hoàn thành lớp. Khi CẢ HAI xác nhận → lớp completed + tặng mã cho cả hai.
const confirmClassCompletion = async (userId, classId) => {
  const classItem = await classRepository.findById(classId);
  if (!classItem) throw new AppError(MESSAGE.CLASS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  if (classItem.status !== CLASS_STATUS.MATCHED) {
    throw new AppError(MESSAGE.CLASS_COMPLETE_ONLY_MATCHED, HTTP_STATUS.BAD_REQUEST);
  }

  const isPoster = String(classItem.createdBy) === String(userId);
  let approvedApp = null;
  let isTutor = false;
  if (!isPoster) {
    approvedApp = await classApplicationRepository.findApprovedByClassId(classId);
    const tutorUserId = approvedApp?.tutorId?.userId?._id ?? approvedApp?.tutorId?.userId;
    isTutor = Boolean(approvedApp) && String(tutorUserId) === String(userId);
  }
  if (!isPoster && !isTutor) {
    throw new AppError(MESSAGE.CLASS_COMPLETE_FORBIDDEN, HTTP_STATUS.FORBIDDEN);
  }

  await withTransaction(async (session) => {
    const freshClass = await classRepository.findById(classId, { session });
    if (!freshClass || freshClass.status !== CLASS_STATUS.MATCHED) {
      throw new AppError(MESSAGE.CLASS_COMPLETE_ONLY_MATCHED, HTTP_STATUS.BAD_REQUEST);
    }

    const freshApprovedApp = await classApplicationRepository.findApprovedByClassId(classId, { session });
    const tutorUserId = freshApprovedApp?.tutorId?.userId?._id ?? freshApprovedApp?.tutorId?.userId;
    const actorIsPoster = String(freshClass.createdBy) === String(userId);
    const actorIsTutor = Boolean(freshApprovedApp) && String(tutorUserId) === String(userId);
    if (!actorIsPoster && !actorIsTutor) {
      throw new AppError(MESSAGE.CLASS_COMPLETE_FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const field = actorIsPoster ? "completedByPoster" : "completedByTutor";
    const afterConfirmation =
      (await classRepository.confirmCompletionBy(classId, field, { session })) || freshClass;
    if (!afterConfirmation.completedByPoster || !afterConfirmation.completedByTutor) return;

    const completed = await classRepository.transitionStatus(
      classId,
      CLASS_STATUS.MATCHED,
      { $set: { status: CLASS_STATUS.COMPLETED, completedAt: new Date() } },
      { session },
    );
    if (!completed) return;

    const recipients = [freshClass.createdBy, tutorUserId].filter(Boolean);
    for (const recipientId of recipients) {
      const voucher = await promoService.generateRewardVoucher(recipientId, {
        classCode: freshClass.classCode,
        session,
      });
      const expiry = new Date(voucher.expiresAt).toLocaleDateString("vi-VN");
      await outboxService.enqueueNotification({
        dedupeKey: `class:${classId}:completed-reward:${recipientId}`,
        userId: recipientId,
        type: NOTIFICATION_TYPES.CLASS_COMPLETED_REWARD,
        message: `Lớp ${freshClass.classCode} (Môn: ${freshClass.subject}) đã hoàn thành! Bạn nhận được mã giảm giá ${voucher.code} (giảm 10%, tối đa 200.000đ), hạn dùng đến ${expiry}. Xem trong "Kho mã giảm giá".`,
      }, { session });
    }
  });

  const updated = await classRepository.findById(classId);
  return maskClassItem(updated, { id: userId });
};

// Lấy danh sách môn học đang bật
const getSubjects = async () => {
  return await subjectService.getActiveSubjectNames();
};

// Lấy cấu hình bảng giá học phí (đã chuẩn hoá cho FE)
const getPricingConfig = async () => {
  const configDoc = await loadPricingConfigDoc();
  return toPricingConfigResponse(configDoc);
};

module.exports = {
  quoteClass,
  createClass,
  createInvitedClass,
  getClasses,
  getClassFeedForTutor,
  getMyPostedClasses,
  getClassById,
  updatePostedClass,
  deletePostedClass,
  confirmClassCompletion,
  getSubjects,
  getPricingConfig,
};
