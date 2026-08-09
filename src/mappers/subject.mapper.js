class SubjectMapper {
  static toDTO(subject) {
    if (!subject) return null;
    const value = subject.toObject ? subject.toObject() : subject;
    return {
      id: String(value._id ?? value.id),
      name: value.name,
      isActive: value.isActive,
      order: value.order,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  }

  static toDTOs(subjects = []) {
    return subjects.map(SubjectMapper.toDTO);
  }
}

module.exports = SubjectMapper;
