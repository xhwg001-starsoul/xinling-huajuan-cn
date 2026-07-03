const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { URL } = require("node:url");
const { generateTeacherReport } = require("./model-adapters");

const rootDir = __dirname;
loadLocalEnv();
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function loadLocalEnv() {
  const envPath = path.join(rootDir, ".env.local");
  if (!require("node:fs").existsSync(envPath)) return;

  const content = require("node:fs").readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function verifyAccessCode(code) {
  if (!process.env.ACCESS_CODE) {
    throw new Error("服务器尚未配置 ACCESS_CODE，请联系管理员。");
  }
  return String(code || "") === String(process.env.ACCESS_CODE);
}

function safeErrorMessage(error) {
  if (!error) return "未知错误";
  if (typeof error === "string") return error;
  return error.message || error.name || "未知错误";
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function analyzeArtwork(req, res) {
  let body = {};
  try {
    body = JSON.parse(await readRequestBody(req));
  } catch {
    return sendJson(res, 400, { error: "请求内容格式不正确，请重新提交。" });
  }

  const { image, profile = {}, accessCode = "" } = body;
  try {
    if (!verifyAccessCode(req.headers["x-access-code"] || accessCode)) {
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

async function verifyAccess(req, res) {
  let body = {};
  try {
    body = JSON.parse(await readRequestBody(req));
  } catch {
    return sendJson(res, 400, { error: "请求内容格式不正确，请重新提交。" });
  }

  try {
    if (!verifyAccessCode(body.accessCode)) {
      return sendJson(res, 401, { error: "访问码不正确，请联系管理员微信 xinghaiweiguang" });
    }
    return sendJson(res, 200, { ok: true });
  } catch (error) {
    return sendJson(res, 500, { error: safeErrorMessage(error) });
  }
}

async function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(rootDir, `.${decodeURIComponent(safePath)}`);

  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  if (requestUrl.pathname === "/api/verify-access" && req.method === "POST") return verifyAccess(req, res);
  if (requestUrl.pathname === "/api/verify-access") return sendJson(res, 405, { error: "只支持 POST 请求。" });
  if (requestUrl.pathname === "/api/analyze" && req.method === "POST") return analyzeArtwork(req, res);
  if (requestUrl.pathname === "/api/analyze") return sendJson(res, 405, { error: "只支持 POST 请求。" });
  await serveStatic(req, res, requestUrl.pathname);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`心灵画卷教师版已启动：http://127.0.0.1:${port}`);
});
