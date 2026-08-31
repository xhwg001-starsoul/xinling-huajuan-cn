const { getBearerToken, sendJson } = require("./_http");
const { requireCurrentUser } = require("../services/authService");
const { analysisCoreStore } = require("../services/ephemeralAnalysisCoreStore");

module.exports = function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });
  try {
    const user = requireCurrentUser(getBearerToken(req));
    const requestUrl = new URL(req.url, "http://127.0.0.1");
    const requestId = requestUrl.searchParams.get("requestId") || "";
    const ownerKey = `cn:${user.organizationId}:${user.id}`;
    return sendJson(res, 200, { stage: analysisCoreStore.getProgress(requestId, ownerKey) || "pending" });
  } catch (error) {
    return sendJson(res, error.statusCode || 401, { error: error.message || "authentication_required" });
  }
};
