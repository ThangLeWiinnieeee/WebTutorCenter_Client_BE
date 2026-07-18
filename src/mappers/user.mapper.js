class UserMapper {
  // Chuyển một người dùng thành DTO trả về FE
  static toDTO(user) {
    if (!user) {
      throw new Error("UserMapper.toDTO: user is required");
    }

    return {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      type: user.type,
      phone: user.phone,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      avatar: user.avatar,
      isActive: user.isActive,
      isVerified: user.isVerified,
      phoneActivated: user.phoneActivated,
      deletedAt: user.deletedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // Chuyển danh sách người dùng thành danh sách DTO
  static toDTOs(users) {
    if (!Array.isArray(users)) return [];
    return users.map((user) => this.toDTO(user));
  }
}

module.exports = UserMapper;
