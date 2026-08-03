const { isMobileClient } = require("./token");

// Nhận diện thiết bị của một request để hiển thị trong danh sách phiên đăng nhập.
// ponytail: dò User-Agent bằng vài regex thay vì kéo thư viện ua-parser về —
// chỉ cần đủ để người dùng nhận ra "máy nào là máy nào", không cần chính xác tuyệt đối.
// Header HTTP chỉ chở latin-1 nên client percent-encode tên máy có dấu.
// Chuỗi không mã hoá (client cũ) vẫn dùng được — decodeURIComponent hỏng thì trả về nguyên bản.
const decodeHeader = (value) => {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const describeDevice = (req) => {
  const ua = req.get?.("user-agent") || "";

  // App mobile tự khai báo tên máy (Constants.deviceName của Expo) — chuẩn hơn mọi phép đoán từ UA.
  if (isMobileClient(req)) {
    return {
      deviceName: decodeHeader(req.get("x-device-name")) || "Ứng dụng di động",
      deviceType: /tablet|ipad/i.test(ua) ? "tablet" : "phone",
    };
  }

  const os =
    /Windows/i.test(ua) ? "Windows" :
    /Macintosh|Mac OS/i.test(ua) ? "macOS" :
    /Android/i.test(ua) ? "Android" :
    /iPhone|iPad|iPod/i.test(ua) ? "iOS" :
    /Linux/i.test(ua) ? "Linux" : "";

  // Thứ tự quan trọng: Edge/Opera cũng chứa "Chrome", Chrome cũng chứa "Safari".
  const browser =
    /Edg\//i.test(ua) ? "Edge" :
    /OPR\/|Opera/i.test(ua) ? "Opera" :
    /Chrome\//i.test(ua) ? "Chrome" :
    /Firefox\//i.test(ua) ? "Firefox" :
    /Safari\//i.test(ua) ? "Safari" : "";

  const deviceType = /iPad|Tablet/i.test(ua)
    ? "tablet"
    : /Mobile|iPhone|Android/i.test(ua)
      ? "phone"
      : "desktop";

  const label = [browser, os].filter(Boolean).join(" trên ");
  return { deviceName: label || "Trình duyệt không xác định", deviceType };
};

module.exports = { describeDevice };
