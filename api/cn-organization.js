const { sendJson, getBearerToken, sendSafeError } = require("./_http");
const { getOrganization } = require("../services/organizationService");

async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });
  try {
    return sendJson(res, 200, { ok: true, organization: getOrganization(getBearerToken(req)) });
  } catch (error) {
    return sendSafeError(res, error, "cn_organization_read_failed");
  }
}

module.exports = handler;
