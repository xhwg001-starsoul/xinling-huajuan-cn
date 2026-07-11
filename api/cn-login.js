const { readJsonBody, sendJson, sendSafeError } = require("./_http");
const { login } = require("../services/authService");

async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" });
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: "bad_json" });
  }
  try {
    const result = await login({ username: body.username, password: body.password, req });
    return sendJson(res, 200, { ok: true, ...result });
  } catch (error) {
    return sendSafeError(res, error, "cn_login_failed");
  }
}

module.exports = handler;
