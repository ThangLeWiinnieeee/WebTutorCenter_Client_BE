class ClassMapper {
  // Chuyển một lớp học thành DTO
  static toDTO(classItem) {
    if (!classItem) return null;

    return {
      id: classItem._id,
      classCode: classItem.classCode,
      createdBy: classItem.createdBy,
      contactPhone: classItem.contactPhone,
      summary: classItem.summary,
      description: classItem.description,
      subject: classItem.subject,
      studentGender: classItem.studentGender,
      studentCount: classItem.studentCount,
      startDate: classItem.startDate,
      minutesPerSession: classItem.minutesPerSession,
      sessionsPerWeek: classItem.sessionsPerWeek,
      provinceCode: classItem.provinceCode,
      provinceName: classItem.provinceName,
      districtCode: classItem.districtCode,
      districtName: classItem.districtName,
      locationLabel: classItem.locationLabel,
      availabilitySlots: classItem.availabilitySlots,
      tutorGenderPref: classItem.tutorGenderPref,
      tutorLevelPref: classItem.tutorLevelPref,
      promoCode: classItem.promoCode,
      promoDiscount: classItem.promoDiscount || 0,
      feePerSession: classItem.feePerSession,
      feePerMonth: classItem.feePerMonth,
      finalFeePerMonth: classItem.finalFeePerMonth ?? classItem.feePerMonth,
      status: classItem.status || "open",
      completedByPoster: Boolean(classItem.completedByPoster),
      completedByTutor: Boolean(classItem.completedByTutor),
      completedAt: classItem.completedAt || null,
      deletedAt: classItem.deletedAt || null,
      createdAt: classItem.createdAt,
      updatedAt: classItem.updatedAt,
    };
  }

  // Chuyển danh sách lớp học thành danh sách DTO
  static toDTOs(classes) {
    if (!Array.isArray(classes)) return [];
    return classes.map((item) => this.toDTO(item));
  }
}

module.exports = ClassMapper;
