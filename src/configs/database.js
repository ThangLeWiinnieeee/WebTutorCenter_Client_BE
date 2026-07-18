require("./dns"); // Ưu tiên DNS công cộng cho SRV/TXT của MongoDB Atlas (xem src/configs/dns.js)
const mongoose = require("mongoose");

// Kết nối tới MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
