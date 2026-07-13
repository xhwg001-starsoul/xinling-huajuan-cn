const os = require("node:os");
const fs = require("node:fs");
const path = require("node:path");
const packageJson = require("../package.json");
const { getDatabase } = require("./db");
const { providerStatus } = require("./systemModelSettingsService");
const { getOrganizationModelSettings } = require("./systemModelSettingsService");
const { requireAdmin } = require("./authService");
const { appMode, dataRoot, databasePath, logsDir, backupsDir, publicDataRootLabel } = require("./dataPaths");

const startedAt = new Date();

function databaseOk() {
  try {
    const row = getDatabase().prepare("PRAGMA integrity_check").get();
    return row && Object.values(row)[0] === "ok";
  } catch {
    return false;
  }
}

function schemaVersion() {
  try {
    return getDatabase().prepare("PRAGMA user_version").get().user_version || 0;
  } catch {
    return 0;
  }
}

function lanAddresses() {
  const results = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      if (entry.address === "127.0.0.1" || entry.address.startsWith("169.254.")) continue;
      results.push(entry.address);
    }
  }
  return Array.from(new Set(results));
}

function latestBackupAt() {
  const dir = path.join(backupsDir, "database");
  try {
    const files = fs.readdirSync(dir)
      .filter((name) => /^xinling-db-.+\.json$/i.test(name))
      .map((name) => {
        const stat = fs.statSync(path.join(dir, name));
        return stat.mtimeMs;
      });
    if (!files.length) return "";
    return new Date(Math.max(...files)).toISOString();
  } catch {
    return "";
  }
}

function diskFreeBytes() {
  try {
    if (typeof fs.statfsSync !== "function") return null;
    return fs.statfsSync(dataRoot).bavail * fs.statfsSync(dataRoot).bsize;
  } catch {
    return null;
  }
}

function publicHealth() {
  return {
    status: databaseOk() ? "ok" : "degraded",
    version: packageJson.version,
    uptimeSeconds: Math.floor(process.uptime()),
    database: databaseOk() ? "ok" : "error",
  };
}

function adminSystemStatus(token) {
  const admin = requireAdmin(token);
  const providers = providerStatus(token);
  const modelSettings = getOrganizationModelSettings(admin.organizationId);
  return {
    version: packageJson.version,
    startedAt: startedAt.toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    appMode,
    host: process.env.HOST || (appMode === "school" ? "0.0.0.0" : "127.0.0.1"),
    port: Number(process.env.PORT || 4185),
    dataRoot: publicDataRootLabel(),
    database: databaseOk() ? "ok" : "error",
    schemaVersion: schemaVersion(),
    latestBackupAt: latestBackupAt(),
    logs: fs.existsSync(logsDir) ? "available" : "not_available",
    providers,
    modelPipeline: {
      pipelineMode: modelSettings.pipelineMode,
      visionProvider: modelSettings.pipelineMode === "split" ? modelSettings.visionProvider : modelSettings.singleProvider,
      textProvider: modelSettings.pipelineMode === "split" ? modelSettings.textProvider : modelSettings.singleProvider,
    },
    diskFreeBytes: diskFreeBytes(),
    lanAddresses: lanAddresses(),
    databaseLocation: databasePath === databasePath ? "configured" : "unknown",
  };
}

module.exports = {
  publicHealth,
  adminSystemStatus,
  lanAddresses,
};
