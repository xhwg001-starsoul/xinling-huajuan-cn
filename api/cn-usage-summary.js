const { URL } = require("node:url");
const { sendJson, getBearerToken, sendSafeError } = require("./_http");
const { usageSummary } = require("../services/usageService");

function query(req) {
  const params = new URL(req.url || "/api/cn-usage-summary", "http://localhost").searchParams;
  return Object.fromEntries(params.entries());
}

async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });
  try {
    return sendJson(res, 200, { ok: true, summary: usageSummary({ token: getBearerToken(req), filters: query(req) }) });
  } catch (error) {
    return sendSafeError(res, error, "cn_usage_summary_failed");
  }
}

module.exports = handler;
