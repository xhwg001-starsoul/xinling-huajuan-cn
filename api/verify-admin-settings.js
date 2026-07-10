const { readJsonBody, sendJson } = require("./_supabase");

function verifyAdminSettingsCode(code) {
  if (!process.env.ADMIN_SETTINGS_CODE) {
    const error = new Error("missing_admin_settings_code_config");
    error.statusCode = 500;
    throw error;
  }
  return String(code || "") === String(process.env.ADMIN_SETTINGS_CODE);
}

async function handler(req, res) {
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
    return sendJson(res, 200, { ok: true });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message || "admin_settings_verify_failed" });
  }
}

module.exports = {
  handler,
  verifyAdminSettingsCode,
};
