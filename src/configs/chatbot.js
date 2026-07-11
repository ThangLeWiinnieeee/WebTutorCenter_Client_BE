const { createInternalClient } = require("../utils/serviceClient");

// Client gọi chatbot-service (FastAPI riêng, xem ../../chatbot-service). Cấu hình đọc từ .env.
// Tách khỏi service để chỗ tạo/cấu hình client gọn một nơi (giống configs/cloudinary, socket…).
const chatbotClient = createInternalClient({
  baseURL: process.env.CHATBOT_URL || "http://localhost:8001",
  secret: process.env.CHATBOT_INTERNAL_SECRET || "",
  timeout: Number(process.env.CHATBOT_TIMEOUT_MS) || 20000,
  serviceLabel: "Trợ lý ảo",
});

module.exports = chatbotClient;
