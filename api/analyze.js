const { generateTeacherReport } = require("../model-adapters");

function accessCodeFrom(req, body) {
  return req.headers["x-access-code"] || body.accessCode || "";
}

function verifyAccessCode(code) {
  if (!process.env.ACCESS_CODE) {
    throw new Error("服务器尚未配置 ACCESS_CODE，请联系管理员。");
  }
  return String(code) === String(process.env.ACCESS_CODE);
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function safeErrorMessage(error) {
  if (!error) return "未知错误";
  if (typeof error === "string") return error;
  return error.message || error.name || "未知错误";
}

async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "只支持 POST 请求。" });

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  } catch {
    return sendJson(res, 400, { error: "请求内容格式不正确，请重新提交。" });
  }

  const { image, profile = {} } = body;
  try {
    if (!verifyAccessCode(accessCodeFrom(req, body))) {
      return sendJson(res, 401, { error: "访问码不正确，请联系管理员微信 xinghaiweiguang" });
    }
  } catch (error) {
    return sendJson(res, 500, { error: safeErrorMessage(error) });
  }
  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    return sendJson(res, 400, { error: "请上传有效的 JPG 或 PNG 图片。" });
  }
  if (image.length > 7_200_000) {
    return sendJson(res, 413, { error: "图片过大，请上传 5MB 以内的图片。" });
  }

  try {
    const result = await generateTeacherReport({ image, profile });
    return sendJson(res, 200, result);
  } catch (error) {
    console.error("模型调用失败：", error);
    return sendJson(res, 500, { error: `服务器暂时无法完成分析：${safeErrorMessage(error)}` });
  }
}

module.exports = handler;
