const dotenv = require("dotenv");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { URL } = require("node:url");

const rootDir = __dirname;
dotenv.config({ path: path.join(rootDir, ".env"), quiet: true });
dotenv.config({ path: path.join(rootDir, ".env.local"), override: true, quiet: true });

const port = Number(process.env.PORT || 4185);

logEnvironmentStatus();

const apiHandlers = {
  "/api/verify-access": require("./api/verify-access"),
  "/api/analyze": require("./api/analyze"),
  "/api/supabase-config": require("./api/supabase-config"),
  "/api/bootstrap-admin": require("./api/bootstrap-admin"),
  "/api/admin-create-user": require("./api/admin-create-user"),
  "/api/admin-update-user-status": require("./api/admin-update-user-status"),
  "/api/admin-reset-password": require("./api/admin-reset-password"),
  "/api/verify-admin-settings": require("./api/verify-admin-settings").handler,
  "/api/model-settings": require("./api/model-settings"),
  "/api/cn-bootstrap-admin": require("./api/cn-bootstrap-admin"),
  "/api/cn-login": require("./api/cn-login"),
  "/api/cn-current-user": require("./api/cn-current-user"),
  "/api/cn-logout": require("./api/cn-logout"),
  "/api/cn-auth-status": require("./api/cn-auth-status"),
  "/api/cn-admin-users": require("./api/cn-admin-users"),
  "/api/cn-admin-create-user": require("./api/cn-admin-create-user"),
  "/api/cn-admin-update-user-status": require("./api/cn-admin-update-user-status"),
  "/api/cn-admin-reset-password": require("./api/cn-admin-reset-password"),
  "/api/cn-change-password": require("./api/cn-change-password"),
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function logEnvironmentStatus() {
  const keys = [
    "ACCESS_CODE",
    "OPENAI_API_KEY",
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ADMIN_INIT_CODE",
    "APP_REGION",
    "AUTH_PROVIDER",
    "SETTINGS_PROVIDER",
    "ADMIN_SETTINGS_CODE",
    "CN_ADMIN_INIT_CODE",
    "CN_SESSION_SECRET",
  ];

  console.log("环境变量检查：");
  for (const key of keys) {
    console.log(`${key}: ${process.env[key] ? "loaded" : "missing"}`);
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
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
  const handler = apiHandlers[requestUrl.pathname];
  if (handler) return handler(req, res);
  if (requestUrl.pathname.startsWith("/api/")) return sendJson(res, 404, { error: "api_not_found" });
  await serveStatic(req, res, requestUrl.pathname);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`心灵画卷大陆版准备项目已启动：http://127.0.0.1:${port}`);
});
