const { sendJson, getBearerToken, sendSafeError } = require("./_http");
const { getAdminModelSettings } = require("../services/systemModelSettingsService");

async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });
  try {
    return sendJson(res, 200, { ok: true, settings: getAdminModelSettings(getBearerToken(req)) });
  } catch (error) {
    return sendSafeError(res, error, "cn_model_settings_failed");
  }
}

module.exports = handler;
