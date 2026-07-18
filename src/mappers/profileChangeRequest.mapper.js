const TutorMapper = require("./tutor.mapper");
const locationCache = require("../utils/locationCache");

class ProfileChangeRequestMapper {
  // Chuyển một yêu cầu đổi hồ sơ thành DTO (kèm hồ sơ hiện tại và phần thay đổi đã dịch tên)
  static async toDTO(doc) {
    if (!doc) return null;

    const tutor = doc.tutorId; // Tutor document đã populate
    const user = doc.userId; // { fullName, email, avatar } đã populate

    const [current, changes] = await Promise.all([
      tutor && tutor._id
        ? TutorMapper.toDTO(tutor, null, null, { includeDocuments: true })
        : Promise.resolve(null),
      ProfileChangeRequestMapper._resolveChanges(doc.changes || {}),
    ]);

    return {
      id: doc._id,
      status: doc.status,
      rejectionReason: doc.rejectionReason ?? null,
      reviewedAt: doc.reviewedAt ?? null,
      createdAt: doc.createdAt,
      user: user
        ? { id: user._id, fullName: user.fullName, email: user.email, avatar: user.avatar }
        : null,
      changes,
      current,
    };
  }

  // Chuyển danh sách yêu cầu đổi hồ sơ thành danh sách DTO
  static async toDTOList(docs) {
    if (!Array.isArray(docs)) return [];
    return Promise.all(docs.map((doc) => ProfileChangeRequestMapper.toDTO(doc)));
  }

  // Resolve mã tỉnh/quận trong phần thay đổi sang tên để admin dễ đọc.
  static async _resolveChanges(changes) {
    const out = { ...changes };
    // _resolve* đọc tên tỉnh/huyện từ locationCache (RAM) — phải nạp trước khi đọc.
    await locationCache.ensureLoaded();
    if (changes.teachingAreas) {
      out.teachingAreas = TutorMapper._resolveTeachingAreas(changes.teachingAreas);
    }
    if (changes.currentArea) {
      out.currentArea = TutorMapper._resolveCurrentArea(changes.currentArea);
    }
    return out;
  }
}

module.exports = ProfileChangeRequestMapper;
