const { URL } = require("node:url");
const { sendJson, getBearerToken, sendSafeError } = require("./_http");
const { usageRecords } = require("../services/usageService");

function query(req) {
  const params = new URL(req.url || "/api/cn-usage-records", "http://localhost").searchParams;
  return Object.fromEntries(params.entries());
}

async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });
  try {
    const values = query(req);
    return sendJson(res, 200, { ok: true, ...usageRecords({
      token: getBearerToken(req),
      filters: values,
      limit: values.limit,
      offset: values.offset,
    }) });
  } catch (error) {
    return sendSafeError(res, error, "cn_usage_records_failed");
  }
}

module.exports = handler;
