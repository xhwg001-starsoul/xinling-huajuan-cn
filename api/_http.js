async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function getBearerToken(req) {
  const value = String(req.headers?.authorization || req.headers?.Authorization || "");
  return value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : "";
}

function sendSafeError(res, error, fallback) {
  const code = typeof error?.message === "string" && /^[a-z0-9_]+$/i.test(error.message)
    ? error.message
    : fallback;
  return sendJson(res, error?.statusCode || 500, { error: code });
}

module.exports = {
  readJsonBody,
  sendJson,
  getBearerToken,
  sendSafeError,
};
