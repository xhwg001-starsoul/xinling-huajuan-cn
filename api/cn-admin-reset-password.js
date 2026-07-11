const { readJsonBody, sendJson, getBearerToken, sendSafeError } = require("./_http");
const { resetTeacherPassword } = require("../services/authService");

async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" });
  let body;
  try { body = await readJsonBody(req); } catch { return sendJson(res, 400, { error: "bad_json" }); }
  try {
    const user = await resetTeacherPassword({
      token: getBearerToken(req),
      userId: body.userId,
      newTemporaryPassword: body.newTemporaryPassword,
    });
    return sendJson(res, 200, { ok: true, user });
  } catch (error) {
    return sendSafeError(res, error, "cn_admin_reset_password_failed");
  }
}

module.exports = handler;
