function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });
  return sendJson(res, 200, {
    url: process.env.VITE_SUPABASE_URL || "",
    anonKey: process.env.VITE_SUPABASE_ANON_KEY || "",
  });
};
