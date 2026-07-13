const { sendJson, getBearerToken, sendSafeError } = require("./_http");
const { adminSystemStatus } = require("../services/systemStatusService");

async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });
  try {
    return sendJson(res, 200, { ok: true, status: adminSystemStatus(getBearerToken(req)) });
  } catch (error) {
    return sendSafeError(res, error, "cn_admin_system_status_failed");
  }
}

module.exports = handler;
