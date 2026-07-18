const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../configs/cloudinary");
const AppError = require("./AppError");

// Cấu hình lưu ảnh đại diện lên Cloudinary (giới hạn 500x500)
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: "webtutorcenter/avatars",
    public_id: `avatar_${req.user.id}_${Date.now()}`,
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [
      { width: 500, height: 500, crop: "limit" },
      { quality: "auto", fetch_format: "auto" },
    ],
  }),
});

// Chỉ cho phép upload file ảnh (JPG/PNG/GIF/WEBP)
const fileFilter = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError("Chỉ hỗ trợ file ảnh (JPG, PNG, GIF, WEBP)", 400), false);
  }
};

// Middleware upload ảnh đại diện (tối đa 5MB)
const uploadAvatarMiddleware = multer({
  storage: avatarStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single("avatar");

// Cấu hình lưu ảnh giấy tờ xác thực gia sư lên Cloudinary (độ phân giải cao, không crop)
const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: "webtutorcenter/documents",
    public_id: `doc_${req.user.id}_${Date.now()}`,
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 1600, height: 1600, crop: "limit" },
      { quality: "auto", fetch_format: "auto" },
    ],
  }),
});

// Middleware upload ảnh giấy tờ (tối đa 8MB)
const uploadDocumentMiddleware = multer({
  storage: documentStorage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
}).single("document");

// Cấu hình lưu ảnh đính kèm trong chat lên Cloudinary
const chatImageStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: "webtutorcenter/chat",
    public_id: `chat_${req.user.id}_${Date.now()}`,
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [
      { width: 1600, height: 1600, crop: "limit" },
      { quality: "auto", fetch_format: "auto" },
    ],
  }),
});

// Middleware upload ảnh trong chat (tối đa 5MB)
const uploadChatImageMiddleware = multer({
  storage: chatImageStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single("image");

// Tách public_id từ URL Cloudinary để gọi destroy
const extractCloudinaryPublicId = (url) => {
  if (!url || !url.includes("cloudinary.com")) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z]+$/);
  return match ? match[1] : null;
};

// Xoá một ảnh trên Cloudinary theo URL (bỏ qua URL không phải Cloudinary; lỗi chỉ log)
const deleteImageFromCloudinary = async (url) => {
  const publicId = extractCloudinaryPublicId(url);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Delete Cloudinary image failed:", publicId, err.message);
  }
};

// Xóa nhiều ảnh trên Cloudinary cùng lúc (gom URL, loại null/trùng, chạy song song).
const deleteImagesFromCloudinary = async (urls = []) => {
  const unique = [...new Set(urls.filter(Boolean))];
  await Promise.allSettled(unique.map(deleteImageFromCloudinary));
};

module.exports = {
  uploadAvatarMiddleware,
  uploadDocumentMiddleware,
  uploadChatImageMiddleware,
  deleteImageFromCloudinary,
  deleteImagesFromCloudinary,
  // Giữ tên cũ cho luồng đổi avatar (alias của deleteImageFromCloudinary).
  deleteAvatarFromCloudinary: deleteImageFromCloudinary,
};
