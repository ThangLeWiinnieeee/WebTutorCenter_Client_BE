const Settings = require("../models/settings.model");

const findByKey = async (key) => {
  return await Settings.findOne({ key }).lean();
};

const upsertValue = async (key, value) => {
  return await Settings.findOneAndUpdate(
    { key },
    { value },
    { upsert: true, new: true, runValidators: true }
  ).lean();
};

module.exports = {
  findByKey,
  upsertValue,
};
