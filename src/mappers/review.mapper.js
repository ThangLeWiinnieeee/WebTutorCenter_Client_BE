class ReviewMapper {
  // DTO công khai cho trang chi tiết gia sư (chỉ thông tin người đánh giá + nội dung)
  static toDTO(review) {
    if (!review) return null;
    const reviewer = review.reviewerId || {};
    return {
      id: review._id,
      rating: review.rating,
      comment: review.comment,
      reviewerName: reviewer.fullName || "Người dùng",
      reviewerAvatar: reviewer.avatar || null,
      reply: ReviewMapper.toReplyDTO(review.reply),
      createdAt: review.createdAt,
    };
  }

  // Phản hồi của gia sư cho đánh giá (null nếu chưa phản hồi)
  static toReplyDTO(reply) {
    if (!reply) return null;
    return {
      comment: reply.comment,
      repliedAt: reply.repliedAt || null,
    };
  }

  // Chuyển danh sách đánh giá thành danh sách DTO công khai
  static toDTOs(reviews) {
    if (!Array.isArray(reviews)) return [];
    return reviews.map((r) => this.toDTO(r));
  }

  // DTO cho khu vực admin xem đánh giá của một gia sư (kèm mã lớp liên quan)
  static toAdminDTO(review) {
    if (!review) return null;
    const reviewer = review.reviewerId || {};
    const classItem = review.classId || {};
    return {
      id: review._id,
      rating: review.rating,
      comment: review.comment,
      reviewerName: reviewer.fullName || "Người dùng",
      reviewerAvatar: reviewer.avatar || null,
      classCode: classItem.classCode || null,
      subject: classItem.subject || null,
      reply: ReviewMapper.toReplyDTO(review.reply),
      createdAt: review.createdAt,
    };
  }

  // Chuyển danh sách đánh giá thành danh sách DTO cho admin
  static toAdminDTOs(reviews) {
    if (!Array.isArray(reviews)) return [];
    return reviews.map((r) => this.toAdminDTO(r));
  }

  // DTO cho thùng rác (kèm tên gia sư + người đánh giá + mã lớp)
  static toTrashDTO(review) {
    if (!review) return null;
    const reviewer = review.reviewerId || {};
    const tutor = review.tutorId || {};
    const tutorUser = tutor.userId || {};
    const classItem = review.classId || {};
    return {
      id: review._id,
      rating: review.rating,
      comment: review.comment,
      reviewerName: reviewer.fullName || "Người dùng",
      tutorName: tutorUser.fullName || "Gia sư",
      classCode: classItem.classCode || null,
      deletedAt: review.deletedAt || null,
    };
  }

  // Chuyển danh sách đánh giá thành danh sách DTO thùng rác
  static toTrashDTOs(reviews) {
    if (!Array.isArray(reviews)) return [];
    return reviews.map((r) => this.toTrashDTO(r));
  }
}

module.exports = ReviewMapper;
