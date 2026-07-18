const locationCache = require("../utils/locationCache");

class TutorMapper {
  // Chuyển hồ sơ gia sư thành DTO (includeDocuments để kèm ảnh giấy tờ cho người được phép xem)
  static async toDTO(tutor, user, cache = null, options = {}) {
    if (!tutor) {
      throw new Error("TutorMapper.toDTO: tutor is required");
    }

    await locationCache.ensureLoaded();
    const teachingAreas = TutorMapper._resolveTeachingAreas(tutor.teachingAreas);
    const currentArea = TutorMapper._resolveCurrentArea(tutor.currentArea);

    const documents = options.includeDocuments
      ? {
          cccdFrontImage: tutor.cccdFrontImage || null,
          cccdBackImage: tutor.cccdBackImage || null,
          studentCardFrontImage: tutor.studentCardFrontImage || null,
          studentCardBackImage: tutor.studentCardBackImage || null,
          certificateImages: tutor.certificateImages || [],
        }
      : {};

    // userId có thể là ObjectId (chưa populate) hoặc populated document.
    // Khi populated, tutor.userId._id trả ObjectId; khi chưa, fallback về tutor.userId.
    // Các field user (fullName, email...) ưu tiên từ param user, fallback sang populated userId.
    return {
      id: tutor._id,
      userId: tutor.userId._id || tutor.userId,
      fullName: user?.fullName || tutor.userId?.fullName || null,
      email: user?.email || tutor.userId?.email || null,
      gender: user?.gender || tutor.userId?.gender || null,
      dateOfBirth: user?.dateOfBirth || tutor.userId?.dateOfBirth || null,
      avatar: user?.avatar || tutor.userId?.avatar || null,
      phone: tutor.phone,
      subjects: tutor.subjects,
      occupationStatus: tutor.occupationStatus,
      teachingAreas,
      currentArea,
      schoolName: tutor.schoolName,
      graduationYear: tutor.graduationYear,
      bio: tutor.bio,
      // Bằng cấp công khai — gia sư chủ động cho mọi người xem (khác ảnh xác thực riêng tư).
      publicCertificateImages: tutor.publicCertificateImages || [],
      availability: tutor.availability,
      totalClassesAccepted: tutor.totalClassesAccepted ?? 0,
      classesAcceptedThisMonth: tutor.classesAcceptedThisMonth ?? 0,
      averageRating: tutor.averageRating ?? 0,
      reviewCount: tutor.reviewCount ?? 0,
      // Huy hiệu "Gia sư uy tín" — service set true cho top theo điểm Bayesian.
      isTrusted: false,
      status: tutor.status,
      rejectionReason: tutor.rejectionReason,
      ...documents,
      createdAt: tutor.createdAt,
      updatedAt: tutor.updatedAt,
    };
  }

  // Chuyển danh sách gia sư thành danh sách DTO
  static async toDTOList(tutors, options = {}) {
    if (!Array.isArray(tutors)) return [];
    await locationCache.ensureLoaded(); // nạp 1 lần cho cả list; toDTO đọc từ RAM
    return Promise.all(tutors.map((tutor) => TutorMapper.toDTO(tutor, null, null, options)));
  }

  // Đọc tên tỉnh/huyện từ locationCache (RAM) — đồng bộ, không query DB.
  static _resolveTeachingAreas(teachingAreas) {
    if (!teachingAreas || !teachingAreas.province) return null;

    const province = locationCache.getProvince(teachingAreas.province);

    let districts = [];
    if (Array.isArray(teachingAreas.districts)) {
      districts = teachingAreas.districts.map((code) => ({
        code,
        name: locationCache.getDistrict(code)?.name || null,
      }));
    }

    return {
      province: teachingAreas.province,
      provinceName: province?.name || null,
      districts,
    };
  }

  // Đọc tên tỉnh/huyện của khu vực hiện tại từ cache
  static _resolveCurrentArea(currentArea) {
    if (!currentArea || !currentArea.province || !currentArea.district) return null;

    const province = locationCache.getProvince(currentArea.province);
    const district = locationCache.getDistrict(currentArea.district);

    return {
      province: currentArea.province,
      district: currentArea.district,
      provinceName: province?.name || null,
      districtName: district?.name || null,
    };
  }
}

module.exports = TutorMapper;
