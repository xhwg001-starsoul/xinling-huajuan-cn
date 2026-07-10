const { readJsonBody, sendJson } = require("./_supabase");
const { getModelSettings, saveModelSettings } = require("../services/modelSettingsStore");
const { verifyAdminSettingsCode } = require("./verify-admin-settings");

function publicSettingsPayload(settings) {
  return {
    pipelineMode: settings.pipelineMode,
    singleProvider: settings.singleProvider,
    singleModel: settings.singleModel,
    visionProvider: settings.visionProvider,
    visionModel: settings.visionModel,
    textProvider: settings.textProvider,
    textModel: settings.textModel,
    updatedAt: settings.updatedAt || "",
    updatedBy: settings.updatedBy || "",
    source: settings.source || "",
  };
}

async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const settings = await getModelSettings();
      return sendJson(res, 200, { ok: true, settings: publicSettingsPayload(settings) });
    } catch (error) {
      const message = error.message === "model_settings_file_invalid" ? "模型设置文件损坏或格式不正确，请检查 data/model-settings.local.json。" : "model_settings_read_failed";
      return sendJson(res, error.statusCode || 500, { error: message });
    }
  }

  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" });

  let body = {};
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: "bad_json" });
  }

  try {
    if (!verifyAdminSettingsCode(body.adminSettingsCode)) {
      return sendJson(res, 401, { error: "invalid_admin_settings_code" });
    }
    const saved = await saveModelSettings(body.settings || {});
    return sendJson(res, 200, { ok: true, settings: publicSettingsPayload(saved) });
  } catch (error) {
    const message = error.message === "model_settings_file_invalid" ? "模型设置文件损坏或格式不正确，请检查 data/model-settings.local.json。" : error.message || "model_settings_save_failed";
    return sendJson(res, error.statusCode || 500, { error: message });
  }
}

module.exports = handler;
