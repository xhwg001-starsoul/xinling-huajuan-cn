function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "只支持 POST 请求。" });
  }

  if (!process.env.ACCESS_CODE) {
    return sendJson(res, 500, { error: "服务器尚未配置 ACCESS_CODE，请联系管理员。" });
  }

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  } catch {
    return sendJson(res, 400, { error: "请求内容格式不正确，请重新提交。" });
  }

  if (String(body.accessCode || "") !== String(process.env.ACCESS_CODE)) {
    return sendJson(res, 401, { error: "访问码不正确，请联系管理员微信 xinghaiweiguang" });
  }

  return sendJson(res, 200, { ok: true });
}

module.exports = handler;
