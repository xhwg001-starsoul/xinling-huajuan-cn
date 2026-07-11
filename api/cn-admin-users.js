const { sendJson, getBearerToken, sendSafeError } = require("./_http");
const { listOrganizationUsers } = require("../services/authService");

async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });
  try {
    const users = listOrganizationUsers(getBearerToken(req));
    return sendJson(res, 200, { ok: true, users });
  } catch (error) {
    return sendSafeError(res, error, "cn_admin_users_failed");
  }
}

module.exports = handler;
