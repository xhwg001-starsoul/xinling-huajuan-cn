const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { URL } = require("node:url");
const { loadRuntimeConfig } = require("./config/loadRuntimeConfig");

const rootDir = __dirname;
loadRuntimeConfig();
const { appMode, dataRoot, runtimeDir } = require("./services/dataPaths");

const port = Number(process.env.PORT || 4185);
const host = process.env.HOST || (appMode === "school" ? "0.0.0.0" : "127.0.0.1");

logEnvironmentStatus();

const apiHandlers = {
  "/api/health": require("./api/health"),
  "/api/version": require("./api/version"),
  "/api/verify-access": require("./api/verify-access"),
  "/api/analyze": require("./api/analyze"),
  "/api/supabase-config": require("./api/supabase-config"),
  "/api/bootstrap-admin": require("./api/bootstrap-admin"),
  "/api/admin-create-user": require("./api/admin-create-user"),
  "/api/admin-update-user-status": require("./api/admin-update-user-status"),
  "/api/admin-reset-password": require("./api/admin-reset-password"),
  "/api/verify-admin-settings": require("./api/verify-admin-settings").handler,
  "/api/model-settings": require("./api/model-settings"),
  "/api/cn-model-settings": require("./api/cn-model-settings"),
  "/api/cn-admin-model-settings": require("./api/cn-admin-model-settings"),
  "/api/cn-admin-model-provider-status": require("./api/cn-admin-model-provider-status"),
  "/api/cn-admin-test-vision-model": require("./api/cn-admin-test-vision-model"),
  "/api/cn-admin-test-text-model": require("./api/cn-admin-test-text-model"),
  "/api/cn-admin-test-model-pipeline": require("./api/cn-admin-test-model-pipeline"),
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
  "/api/cn-organization": require("./api/cn-organization"),
  "/api/cn-admin-organization": require("./api/cn-admin-organization"),
  "/api/cn-usage-summary": require("./api/cn-usage-summary"),
  "/api/cn-usage-records": require("./api/cn-usage-records"),
  "/api/cn-admin-system-status": require("./api/cn-admin-system-status"),
  "/api/cn-admin-backups": require("./api/cn-admin-backups"),
  "/api/cn-admin-restore-database": require("./api/cn-admin-restore-database"),
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
    "APP_MODE",
    "HOST",
    "PORT",
  ];

  console.log("鐜鍙橀噺妫€鏌ワ細");
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
  if (requestUrl.pathname.startsWith("/api/cn-admin-backups/")) return apiHandlers["/api/cn-admin-backups"](req, res);
  if (requestUrl.pathname.startsWith("/api/")) return sendJson(res, 404, { error: "api_not_found" });
  await serveStatic(req, res, requestUrl.pathname);
});

server.listen(port, host, async () => {
  const pidPath = path.join(runtimeDir, "xinling.pid");
  await fs.writeFile(pidPath, String(process.pid), "utf8").catch(() => {});
  console.log(`Xinling Huajuan CN started: http://127.0.0.1:${port}`);
  console.log(`Listening: ${host}:${port}`);
  console.log(`Mode: ${appMode}`);
  console.log(`Data root: ${dataRoot}`);
});
