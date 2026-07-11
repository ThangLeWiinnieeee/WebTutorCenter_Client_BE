// Chạy SAU authMiddleware.optional + validate(askSchema): gom việc bóc JWT thô +
// chuẩn hoá user từ req thành payload gửi chatbot, để controller chỉ còn gọi service
// và trả data. Không tự verify token (authMiddleware.optional đã làm và set req.user).
const buildChatbotRequest = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const authToken =
    authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  const user = req.user ? { id: req.user.id, role: req.user.role } : undefined;

  req.chatbotRequest = {
    message: req.body.message,
    history: req.body.history,
    sessionId: req.body.sessionId,
    user,
    authToken,
  };
  next();
};

module.exports = { buildChatbotRequest };
