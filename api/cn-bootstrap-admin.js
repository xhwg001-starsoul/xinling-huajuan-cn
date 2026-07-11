const { readJsonBody, sendJson, sendSafeError } = require("./_http");
const { bootstrapAdmin } = require("../services/authService");

async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" });
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: "bad_json" });
  }
  try {
    const user = await bootstrapAdmin(body);
    return sendJson(res, 201, { ok: true, user });
  } catch (error) {
    return sendSafeError(res, error, "cn_bootstrap_admin_failed");
  }
}

module.exports = handler;
