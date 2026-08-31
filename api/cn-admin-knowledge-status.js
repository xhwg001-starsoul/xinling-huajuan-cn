const { sendJson, getBearerToken, sendSafeError } = require("./_http");
const { requireAdmin } = require("../services/authService");
const { getOrganizationModelSettings } = require("../services/systemModelSettingsService");
const { getKnowledgeBaseService } = require("../services/knowledgeBaseService");

async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });
  try {
    const admin = requireAdmin(getBearerToken(req));
    const settings = getOrganizationModelSettings(admin.organizationId);
    const service = getKnowledgeBaseService();
    service.load({ enabled: settings.knowledgeBaseEnabled });
    return sendJson(res, 200, { ok: true, knowledgeEnabled: settings.knowledgeBaseEnabled, status: service.getStatus() });
  } catch (error) {
    return sendSafeError(res, error, "cn_admin_knowledge_status_failed");
  }
}

module.exports = handler;
