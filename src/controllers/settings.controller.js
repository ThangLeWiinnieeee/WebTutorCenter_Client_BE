const Settings = require("../models/settings.model");
const { successResponse } = require("../utils/response");
const AppError = require("../utils/AppError");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");

const DEFAULT_FOOTER = {
  address: "54 Nguyễn Lương Bằng, Hòa Khánh Bắc, Liên Chiểu, Đà Nẵng",
  phone: "093 143 9203",
  email: "contact@webtutor.vn",
  facebookLink: "https://facebook.com/webtutor",
  zaloLink: "https://zalo.me/0931439203",
  instagramLink: "",
  twitterLink: "",
};

// Lấy cấu hình footer (tự tạo giá trị mặc định nếu chưa có)
const getFooterSettings = async (req, res, next) => {
  try {
    let footer;
    try {
      footer = await Settings.findOneAndUpdate(
        { key: "footer" },
        { $setOnInsert: { value: DEFAULT_FOOTER } },
        { upsert: true, new: true }
      );
    } catch (err) {
      if (err.code === 11000 || err.message.includes("E11000")) {
        footer = await Settings.findOne({ key: "footer" });
      } else {
        throw err;
      }
    }

    if (!footer) {
      footer = { value: DEFAULT_FOOTER };
    }

    return successResponse(res, {
      message: MESSAGE.SETTINGS_FOOTER_GET_SUCCESS,
      data: footer.value,
    });
  } catch (error) {
    next(error);
  }
};

// Cập nhật cấu hình footer
const updateFooterSettings = async (req, res, next) => {
  try {
    const payload = req.body;
    
    // Kiểm tra các trường bắt buộc
    if (!payload.address || !payload.phone || !payload.email) {
      throw new AppError(MESSAGE.SETTINGS_FOOTER_REQUIRED, HTTP_STATUS.BAD_REQUEST);
    }

    const value = {
      address: payload.address.trim(),
      phone: payload.phone.trim(),
      email: payload.email.trim(),
      facebookLink: (payload.facebookLink || "").trim(),
      zaloLink: (payload.zaloLink || "").trim(),
      instagramLink: (payload.instagramLink || "").trim(),
      twitterLink: (payload.twitterLink || "").trim(),
    };

    let footer;
    try {
      footer = await Settings.findOneAndUpdate(
        { key: "footer" },
        { value },
        { upsert: true, new: true }
      );
    } catch (err) {
      if (err.code === 11000 || err.message.includes("E11000")) {
        footer = await Settings.findOneAndUpdate(
          { key: "footer" },
          { value },
          { upsert: true, new: true }
        );
      } else {
        throw err;
      }
    }

    return successResponse(res, {
      message: MESSAGE.SETTINGS_FOOTER_UPDATE_SUCCESS,
      data: footer.value,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFooterSettings,
  updateFooterSettings,
};
