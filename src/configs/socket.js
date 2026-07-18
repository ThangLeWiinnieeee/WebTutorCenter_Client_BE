const { Server } = require("socket.io");
const { verifyAccessToken } = require("../utils/token");
const corsOptions = require("./cors");
const ROLES = require("../constants/role");

let io = null;

// Tên phòng riêng của một người dùng
const userRoom = (userId) => `user:${userId}`;
const ADMIN_ROOM = "admins";

// Khởi tạo Socket.IO trên cùng HTTP server với Express.
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: corsOptions.origin,
      credentials: true,
    },
  });

  // Xác thực bằng access token (gửi qua handshake.auth.token), tái dùng JWT của REST.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Thiếu token xác thực"));
      socket.data.user = verifyAccessToken(token);
      next();
    } catch (err) {
      next(new Error("Token không hợp lệ"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    if (!user?.id) return socket.disconnect(true);

    // Mỗi user vào phòng riêng để nhận tin gửi đích danh; admin vào thêm phòng chung.
    socket.join(userRoom(user.id));
    if (user.role === ROLES.ADMIN) socket.join(ADMIN_ROOM);
  });

  return io;
};

// Lấy instance Socket.IO hiện tại
const getIO = () => io;

// Phát sự kiện tới một người dùng (bỏ qua nếu io chưa khởi tạo)
const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return;
  io.to(userRoom(userId)).emit(event, payload);
};

// Phát sự kiện tới tất cả admin
const emitToAdmins = (event, payload) => {
  if (!io) return;
  io.to(ADMIN_ROOM).emit(event, payload);
};

module.exports = { initSocket, getIO, emitToUser, emitToAdmins };
