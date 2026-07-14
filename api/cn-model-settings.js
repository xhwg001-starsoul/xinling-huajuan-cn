const { sendJson, getBearerToken, sendSafeError } = require("./_http");
const { getAdminModelSettings } = require("../services/systemModelSettingsService");
const { resolveModelRuntimeConfig, safeRuntimeDiagnostic } = require("../services/modelRuntimeConfigService");

async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });
  try {
    const settings = getAdminModelSettings(getBearerToken(req));
    const runtime = resolveModelRuntimeConfig(settings, { source: settings.source || "sqlite" });
    return sendJson(res, 200, {
      ok: true,
      settings,
      runtime: safeRuntimeDiagnostic(runtime),
    });
  } catch (error) {
    return sendSafeError(res, error, "cn_model_settings_failed");
  }
}

module.exports = handler;
