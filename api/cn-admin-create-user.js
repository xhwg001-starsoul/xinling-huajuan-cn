const { readJsonBody, sendJson, getBearerToken, sendSafeError } = require("./_http");
const { createTeacher } = require("../services/authService");

async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" });
  let body;
  try { body = await readJsonBody(req); } catch { return sendJson(res, 400, { error: "bad_json" }); }
  try {
    const user = await createTeacher({
      token: getBearerToken(req),
      username: body.username,
      displayName: body.displayName,
      temporaryPassword: body.temporaryPassword,
    });
    return sendJson(res, 201, { ok: true, user });
  } catch (error) {
    return sendSafeError(res, error, "cn_admin_create_user_failed");
  }
}

module.exports = handler;
