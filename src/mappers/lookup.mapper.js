class LookupMapper {
  static toDTO(lookup) {
    if (!lookup) return null;
    const value = lookup.toObject ? lookup.toObject() : lookup;
    return {
      _id: value._id,
      type: value.type,
      value: value.value,
      label: value.label,
      parentId: value.parentId,
      order: value.order,
      isActive: value.isActive,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
      __v: value.__v,
    };
  }

  static toDTOs(lookups = []) {
    return lookups.map(LookupMapper.toDTO);
  }
}

module.exports = LookupMapper;
