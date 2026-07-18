const { createInternalClient } = require("../utils/serviceClient");

// Client gọi chatbot-service (FastAPI riêng), cấu hình đọc từ .env
const chatbotClient = createInternalClient({
  baseURL: process.env.CHATBOT_URL || "http://localhost:8001",
  secret: process.env.CHATBOT_INTERNAL_SECRET || "",
  timeout: Number(process.env.CHATBOT_TIMEOUT_MS) || 20000,
  serviceLabel: "Trợ lý ảo",
});

module.exports = chatbotClient;
