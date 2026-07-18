// Gom message + user + JWT từ req thành payload gửi chatbot-service
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
