const { sendJson, getBearerToken, sendSafeError } = require("./_http");
const { logout } = require("../services/authService");

async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" });
  try {
    logout(getBearerToken(req));
    return sendJson(res, 200, { ok: true });
  } catch (error) {
    return sendSafeError(res, error, "cn_logout_failed");
  }
}

module.exports = handler;
