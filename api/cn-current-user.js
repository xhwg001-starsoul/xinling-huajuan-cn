const { sendJson, getBearerToken, sendSafeError } = require("./_http");
const { requireCurrentUser } = require("../services/authService");

async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });
  try {
    const user = requireCurrentUser(getBearerToken(req));
    return sendJson(res, 200, { ok: true, user });
  } catch (error) {
    return sendSafeError(res, error, "not_logged_in");
  }
}

module.exports = handler;
