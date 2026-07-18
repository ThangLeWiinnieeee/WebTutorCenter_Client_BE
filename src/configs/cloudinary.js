const { v2: cloudinary } = require("cloudinary");

// Cấu hình Cloudinary dùng để upload/xoá ảnh
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

module.exports = cloudinary;
