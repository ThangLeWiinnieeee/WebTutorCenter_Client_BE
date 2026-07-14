const { CLASS_APPLICATION_STATUS } = require("../constants/classApplication");

class ClassApplicationMapper {
  static toDTO(application) {
    if (!application) return null;

    const classItem = application.classId || {};
    const tutor = application.tutorId || {};
    const tutorUser = tutor.userId || {};

    return {
      id: application._id,
      status: application.status,
      origin: application.origin || "apply",
      rejectionReason: application.rejectionReason ?? null,
      cancellationReason: application.cancellationReason ?? null,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      classItem: {
        id: classItem._id,
        classCode: classItem.classCode,
        subject: classItem.subject,
        summary: classItem.summary,
        locationLabel: classItem.locationLabel,
        feePerSession: classItem.feePerSession,
        feePerMonth: classItem.feePerMonth,
        finalFeePerMonth: classItem.finalFeePerMonth ?? classItem.feePerMonth,
        promoCode: classItem.promoCode ?? null,
        promoDiscount: classItem.promoDiscount ?? 0,
        sessionsPerWeek: classItem.sessionsPerWeek,
        minutesPerSession: classItem.minutesPerSession,
        contactPhone: classItem.contactPhone,
        description: classItem.description,
        studentGender: classItem.studentGender,
        studentCount: classItem.studentCount,
        startDate: classItem.startDate,
        availabilitySlots: classItem.availabilitySlots ?? [],
        tutorGenderPref: classItem.tutorGenderPref,
        tutorLevelPref: classItem.tutorLevelPref,
        provinceCode: classItem.provinceCode,
        districtCode: classItem.districtCode,
        provinceName: classItem.provinceName,
        districtName: classItem.districtName,
        status: classItem.status || "open",
        createdAt: classItem.createdAt,
      },
      tutor: {
        id: tutor._id,
        // userId (tài khoản người dùng) để admin mở hội thoại chat với gia sư
        userId: tutorUser._id ?? null,
        fullName: tutorUser.fullName ?? null,
        email: tutorUser.email ?? null,
        avatar: tutorUser.avatar ?? null,
        gender: tutorUser.gender ?? null,
        subjects: tutor.subjects ?? [],
        phone: tutor.phone ?? null,
        occupationStatus: tutor.occupationStatus ?? null,
        schoolName: tutor.schoolName ?? null,
        graduationYear: tutor.graduationYear ?? null,
        bio: tutor.bio ?? null,
        availability: tutor.availability ?? [],
        totalClassesAccepted: tutor.totalClassesAccepted ?? 0,
      },
    };
  }

  static toDTOs(applications) {
    if (!Array.isArray(applications)) return [];
    return applications.map((a) => this.toDTO(a));
  }

  /**
   * DTO gọn cho người đăng xem & chọn gia sư ứng tuyển.
   * Chỉ gồm thông tin gia sư cần để quyết định (không lộ thông tin riêng tư của lớp).
   */
  static toApplicantDTO(application) {
    if (!application) return null;
    const tutor = application.tutorId || {};
    const tutorUser = tutor.userId || {};

    return {
      id: application._id,
      status: application.status,
      createdAt: application.createdAt,
      tutor: {
        id: tutor._id,
        fullName: tutorUser.fullName ?? null,
        avatar: tutorUser.avatar ?? null,
        gender: tutorUser.gender ?? null,
        subjects: tutor.subjects ?? [],
        occupationStatus: tutor.occupationStatus ?? null,
        schoolName: tutor.schoolName ?? null,
        graduationYear: tutor.graduationYear ?? null,
        bio: tutor.bio ?? null,
        totalClassesAccepted: tutor.totalClassesAccepted ?? 0,
      },
    };
  }

  static toApplicantDTOs(applications) {
    if (!Array.isArray(applications)) return [];
    return applications.map((a) => this.toApplicantDTO(a));
  }

  /**
   * DTO thông tin gia sư đã được admin duyệt nhận lớp — KÈM số điện thoại liên hệ.
   * Chỉ dùng cho người đăng (chủ bài) / admin xem trong "Bài đăng của tôi" và chi tiết
   * bài đã ghép; KHÔNG dùng ở danh sách ứng tuyển (để không lộ SĐT trước khi được duyệt).
   */
  static toMatchedTutorDTO(application) {
    if (!application) return null;
    const tutor = application.tutorId || {};
    const tutorUser = tutor.userId || {};

    return {
      id: tutor._id,
      fullName: tutorUser.fullName ?? null,
      avatar: tutorUser.avatar ?? null,
      gender: tutorUser.gender ?? null,
      phone: tutor.phone ?? null,
      subjects: tutor.subjects ?? [],
      occupationStatus: tutor.occupationStatus ?? null,
      schoolName: tutor.schoolName ?? null,
      graduationYear: tutor.graduationYear ?? null,
      totalClassesAccepted: tutor.totalClassesAccepted ?? 0,
    };
  }

  /**
   * DTO cho gia sư xem các lớp mình đã nhận.
   * Chỉ khi đơn đã được CHẤP NHẬN (approved) mới trả về thông tin chi tiết/riêng tư
   * của lớp (SĐT liên hệ, mô tả đầy đủ, khung giờ cụ thể). Các trạng thái khác chỉ
   * trả về thông tin công khai.
   */
  static toMineDTO(application) {
    if (!application) return null;

    const classItem = application.classId || {};
    const isUnlocked = application.status === CLASS_APPLICATION_STATUS.APPROVED;

    const publicInfo = {
      id: classItem._id,
      classCode: classItem.classCode,
      subject: classItem.subject,
      summary: classItem.summary,
      locationLabel: isUnlocked
        ? classItem.locationLabel
        : `${classItem.districtName || ""}, ${classItem.provinceName || ""}`.replace(/^, /, ""),
      feePerSession: classItem.feePerSession,
      feePerMonth: classItem.feePerMonth,
      sessionsPerWeek: classItem.sessionsPerWeek,
      minutesPerSession: classItem.minutesPerSession,
      studentCount: classItem.studentCount,
      studentGender: classItem.studentGender,
      startDate: classItem.startDate,
      tutorGenderPref: classItem.tutorGenderPref,
      tutorLevelPref: classItem.tutorLevelPref,
      provinceName: classItem.provinceName,
      districtName: classItem.districtName,
      status: classItem.status || "open",
      completedByPoster: Boolean(classItem.completedByPoster),
      completedByTutor: Boolean(classItem.completedByTutor),
      createdAt: classItem.createdAt,
    };

    const privateInfo = isUnlocked
      ? {
          description: classItem.description,
          contactPhone: classItem.contactPhone,
          availabilitySlots: classItem.availabilitySlots ?? [],
          provinceCode: classItem.provinceCode,
          districtCode: classItem.districtCode,
          locationLabel: classItem.locationLabel,
        }
      : {};

    return {
      id: application._id,
      status: application.status,
      // Nguồn gốc đơn: "apply" (gia sư tự nhận lớp) | "invite" (người đăng mời dạy)
      origin: application.origin || "apply",
      rejectionReason: application.rejectionReason ?? null,
      cancellationReason: application.cancellationReason ?? null,
      isUnlocked,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      classItem: { ...publicInfo, ...privateInfo },
    };
  }

  static toMineDTOs(applications) {
    if (!Array.isArray(applications)) return [];
    return applications.map((a) => this.toMineDTO(a));
  }

  /**
   * DTO lời mời dạy lớp cho gia sư xem & ra quyết định (đồng ý / từ chối).
   * Trả đủ thông tin để gia sư quyết định (mô tả, khung giờ, khu vực, học phí) nhưng
   * KHÔNG lộ SĐT liên hệ và địa chỉ chi tiết — chỉ hiện sau khi admin duyệt.
   */
  static toInvitationDTO(application) {
    if (!application) return null;
    const classItem = application.classId || {};

    return {
      id: application._id,
      status: application.status,
      rejectionReason: application.rejectionReason ?? null,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      classItem: {
        id: classItem._id,
        classCode: classItem.classCode,
        subject: classItem.subject,
        summary: classItem.summary,
        description: classItem.description,
        feePerSession: classItem.feePerSession,
        feePerMonth: classItem.feePerMonth,
        finalFeePerMonth: classItem.finalFeePerMonth ?? classItem.feePerMonth,
        sessionsPerWeek: classItem.sessionsPerWeek,
        minutesPerSession: classItem.minutesPerSession,
        studentCount: classItem.studentCount,
        studentGender: classItem.studentGender,
        startDate: classItem.startDate,
        availabilitySlots: classItem.availabilitySlots ?? [],
        tutorGenderPref: classItem.tutorGenderPref,
        tutorLevelPref: classItem.tutorLevelPref,
        provinceName: classItem.provinceName,
        districtName: classItem.districtName,
        // Khu vực chung chung; KHÔNG trả contactPhone / locationLabel chi tiết
        status: classItem.status || "open",
        createdAt: classItem.createdAt,
      },
    };
  }

  static toInvitationDTOs(applications) {
    if (!Array.isArray(applications)) return [];
    return applications.map((a) => this.toInvitationDTO(a));
  }

  /**
   * DTO gia sư được mời (gắn vào "Bài đăng của tôi" để người đăng theo dõi kết quả mời).
   * Gồm trạng thái lời mời + lý do từ chối (nếu có). Không kèm SĐT — khi đã duyệt thì
   * người đăng xem qua matchedTutor (đã có SĐT).
   */
  static toInvitedTutorDTO(application) {
    if (!application) return null;
    const tutor = application.tutorId || {};
    const tutorUser = tutor.userId || {};

    return {
      applicationId: application._id,
      status: application.status,
      declineReason: application.rejectionReason ?? null,
      tutor: {
        id: tutor._id,
        fullName: tutorUser.fullName ?? null,
        avatar: tutorUser.avatar ?? null,
        gender: tutorUser.gender ?? null,
        subjects: tutor.subjects ?? [],
        occupationStatus: tutor.occupationStatus ?? null,
        schoolName: tutor.schoolName ?? null,
        graduationYear: tutor.graduationYear ?? null,
        totalClassesAccepted: tutor.totalClassesAccepted ?? 0,
      },
    };
  }
}

module.exports = ClassApplicationMapper;
