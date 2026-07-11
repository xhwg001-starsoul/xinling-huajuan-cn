const { sendJson, sendSafeError } = require("./_http");
const { getAuthStatus } = require("../services/authService");

async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });
  try {
    return sendJson(res, 200, getAuthStatus());
  } catch (error) {
    return sendSafeError(res, error, "cn_auth_status_failed");
  }
}

module.exports = handler;
