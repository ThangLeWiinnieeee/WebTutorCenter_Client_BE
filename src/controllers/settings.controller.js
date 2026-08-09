const settingsService = require("../services/settings.service");
const { successResponse } = require("../utils/response");
const MESSAGE = require("../constants/message");

// Lấy cấu hình công khai dùng chung cho footer, hotline và hợp đồng mẫu.
const getFooterSettings = async (req, res, next) => {
  try {
    const footer = await settingsService.getFooterSettings();

    return successResponse(res, {
      message: MESSAGE.SETTINGS_FOOTER_GET_SUCCESS,
      data: footer,
    });
  } catch (error) {
    next(error);
  }
};

// Cập nhật cấu hình công khai từ dữ liệu admin gửi lên.
const updateFooterSettings = async (req, res, next) => {
  try {
    const footer = await settingsService.updateFooterSettings(req.body);

    return successResponse(res, {
      message: MESSAGE.SETTINGS_FOOTER_UPDATE_SUCCESS,
      data: footer,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFooterSettings,
  updateFooterSettings,
};
