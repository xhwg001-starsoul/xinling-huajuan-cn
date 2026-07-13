const { readJsonBody, sendJson, getBearerToken, sendSafeError } = require("./_http");
const { restoreFromBackup } = require("../services/restoreService");

async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" });
  let body;
  try { body = await readJsonBody(req); } catch { return sendJson(res, 400, { error: "bad_json" }); }
  try {
    const result = await restoreFromBackup({
      token: getBearerToken(req),
      backupId: body.backupId,
      currentPassword: body.currentPassword,
      confirmText: body.confirmText,
    });
    return sendJson(res, 200, { ok: true, result });
  } catch (error) {
    return sendSafeError(res, error, "cn_admin_restore_database_failed");
  }
}

module.exports = handler;
