const { readJsonBody, sendJson, getBearerToken, sendSafeError } = require("./_http");
const { updateOrganization } = require("../services/organizationService");

async function handler(req, res) {
  if (!['POST', 'PUT'].includes(req.method)) return sendJson(res, 405, { error: "method_not_allowed" });
  let body;
  try { body = await readJsonBody(req); } catch { return sendJson(res, 400, { error: "bad_json" }); }
  try {
    const organization = updateOrganization({ token: getBearerToken(req), ...body });
    return sendJson(res, 200, { ok: true, organization });
  } catch (error) {
    return sendSafeError(res, error, "cn_organization_update_failed");
  }
}

module.exports = handler;
