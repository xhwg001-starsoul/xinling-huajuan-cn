const { readJsonBody, sendJson, getBearerToken, sendSafeError } = require("./_http");
const { updateUserStatus } = require("../services/authService");

async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" });
  let body;
  try { body = await readJsonBody(req); } catch { return sendJson(res, 400, { error: "bad_json" }); }
  if (typeof body.isActive !== "boolean") return sendJson(res, 400, { error: "invalid_active_status" });
  try {
    const user = updateUserStatus({ token: getBearerToken(req), userId: body.userId, isActive: body.isActive });
    return sendJson(res, 200, { ok: true, user });
  } catch (error) {
    return sendSafeError(res, error, "cn_admin_update_user_status_failed");
  }
}

module.exports = handler;
