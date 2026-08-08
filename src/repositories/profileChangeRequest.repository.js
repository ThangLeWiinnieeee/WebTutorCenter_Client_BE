const ProfileChangeRequest = require("../models/profileChangeRequest.model");
const { PROFILE_CHANGE_STATUS } = require("../constants/profileChangeRequest");

const POPULATE_USER = "fullName email avatar";

// Tạo yêu cầu đổi hồ sơ mới
const create = async (data) => {
  const doc = new ProfileChangeRequest(data);
  return await doc.save();
};

// Tìm yêu cầu đổi hồ sơ đang chờ duyệt của một gia sư
const findPendingByTutorId = async (tutorId) => {
  return await ProfileChangeRequest.findOne({
    tutorId,
    status: PROFILE_CHANGE_STATUS.PENDING,
  });
};

// Lấy chi tiết một yêu cầu đổi hồ sơ theo id
const findById = async (id, { session } = {}) => {
  return await ProfileChangeRequest.findById(id)
    .session(session || null)
    .populate("userId", POPULATE_USER)
    .populate("tutorId");
};

// Một trang yêu cầu (lọc theo trạng thái nếu có), mới nhất trước.
const findPage = async ({ status, page = 1, limit = 10 }) => {
  const filter = {};
  if (status && status !== "all") filter.status = status;
  const skip = (Math.max(1, page) - 1) * limit;
  return await ProfileChangeRequest.find(filter)
    .populate("userId", POPULATE_USER)
    .populate("tutorId")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Đếm số yêu cầu đổi hồ sơ theo từng trạng thái
const countGrouped = async () => {
  const [pending, approved, rejected] = await Promise.all([
    ProfileChangeRequest.countDocuments({ status: PROFILE_CHANGE_STATUS.PENDING }),
    ProfileChangeRequest.countDocuments({ status: PROFILE_CHANGE_STATUS.APPROVED }),
    ProfileChangeRequest.countDocuments({ status: PROFILE_CHANGE_STATUS.REJECTED }),
  ]);
  return { pending, approved, rejected };
};

// Cập nhật một yêu cầu đổi hồ sơ
const update = async (id, updateData, { session } = {}) => {
  return await ProfileChangeRequest.findByIdAndUpdate(id, updateData, { new: true, session })
    .populate("userId", POPULATE_USER)
    .populate("tutorId");
};

const transitionStatus = async (id, expectedStatus, updateData, { session } = {}) => {
  return ProfileChangeRequest.findOneAndUpdate(
    { _id: id, status: expectedStatus },
    updateData,
    { new: true, runValidators: true, session },
  );
};

// Xóa toàn bộ yêu cầu đổi hồ sơ của một người dùng (xóa vĩnh viễn tài khoản)
const deleteByUserId = async (userId) => {
  return await ProfileChangeRequest.deleteMany({ userId });
};

module.exports = {
  create,
  findPendingByTutorId,
  findById,
  findPage,
  countGrouped,
  update,
  transitionStatus,
  deleteByUserId,
};
