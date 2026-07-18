const ClassPricingConfig = require("../models/class.pricing.model");

const DEFAULT_CONFIG_KEY = "default";

// Lấy cấu hình bảng giá mặc định
const findDefault = async () => {
  return await ClassPricingConfig.findOne({ configKey: DEFAULT_CONFIG_KEY }).lean();
};

// Tạo mới hoặc cập nhật cấu hình bảng giá mặc định
const upsertDefault = async (payload) => {
  return await ClassPricingConfig.findOneAndUpdate(
    { configKey: DEFAULT_CONFIG_KEY },
    { ...payload, configKey: DEFAULT_CONFIG_KEY },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
};

module.exports = {
  findDefault,
  upsertDefault,
};
