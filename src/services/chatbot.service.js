const chatbotClient = require("../configs/chatbot");

// Chuyển tiếp câu hỏi người dùng sang chatbot-service (FastAPI) và trả về kết quả
const ask = async ({ message, history = [], sessionId, user, authToken } = {}) => {
  // Forward Bearer token của user theo từng request (X-Internal-Secret đã gắn mặc định ở client).
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  const { data } = await chatbotClient.post(
    "/api/chat",
    { message, history, sessionId, user },
    { headers }
  );
  return data;
};

module.exports = { ask };
