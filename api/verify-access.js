const { readJsonBody, sendJson } = require("./_supabase");

async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" });
  if (!process.env.ACCESS_CODE) return sendJson(res, 500, { error: "missing_access_code_config" });

  let body = {};
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: "bad_json" });
  }

  if (String(body.accessCode || "") !== String(process.env.ACCESS_CODE)) {
    return sendJson(res, 401, { error: "invalid_access_code" });
  }

  return sendJson(res, 200, { ok: true });
}

module.exports = handler;
