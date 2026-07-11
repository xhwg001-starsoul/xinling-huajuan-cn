const { readJsonBody, sendJson, getBearerToken, sendSafeError } = require("./_http");
const { changePassword } = require("../services/authService");

async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" });
  let body;
  try { body = await readJsonBody(req); } catch { return sendJson(res, 400, { error: "bad_json" }); }
  try {
    await changePassword({
      token: getBearerToken(req),
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
      confirmPassword: body.confirmPassword,
    });
    return sendJson(res, 200, { ok: true, requiresLogin: true });
  } catch (error) {
    return sendSafeError(res, error, "cn_change_password_failed");
  }
}

module.exports = handler;
