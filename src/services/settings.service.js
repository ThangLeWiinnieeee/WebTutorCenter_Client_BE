const settingsRepository = require("../repositories/settings.repository");
const { normalizeContractHtml } = require("../utils/contractHtml");

const getFooterSettings = async () => {
  const footer = await settingsRepository.findByKey("footer");
  return footer?.value || {};
};

const updateFooterSettings = async (payload = {}) => {
  const currentValue = await getFooterSettings();
  const value = {
    ...currentValue,
    ...payload,
    ...(payload.contractHtml !== undefined
      ? { contractHtml: normalizeContractHtml(payload.contractHtml) }
      : {}),
  };

  const footer = await settingsRepository.upsertValue("footer", value);
  return footer.value;
};

module.exports = {
  getFooterSettings,
  updateFooterSettings,
};
