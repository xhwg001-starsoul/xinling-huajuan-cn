const { readJsonBody, sendJson, getBearerToken, sendSafeError } = require("./_http");
const { saveAdminModelSettings } = require("../services/systemModelSettingsService");
const { resolveModelRuntimeConfig, safeRuntimeDiagnostic } = require("../services/modelRuntimeConfigService");

async function handler(req, res) {
  if (!["POST", "PUT"].includes(req.method)) return sendJson(res, 405, { error: "method_not_allowed" });
  let body;
  try { body = await readJsonBody(req); } catch { return sendJson(res, 400, { error: "bad_json" }); }
  try {
    const settings = saveAdminModelSettings({ token: getBearerToken(req), settings: body.settings || body });
    const runtime = resolveModelRuntimeConfig(settings, { source: settings.source || "sqlite" });
    return sendJson(res, 200, { ok: true, settings, runtime: safeRuntimeDiagnostic(runtime) });
  } catch (error) {
    return sendSafeError(res, error, "cn_admin_model_settings_failed");
  }
}

module.exports = handler;
