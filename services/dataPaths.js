const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const appMode = String(process.env.APP_MODE || "development").trim().toLowerCase() === "school"
  ? "school"
  : "development";

function defaultSchoolRoot() {
  return process.platform === "win32"
    ? "C:\\ProgramData\\XinlingHuajuan"
    : path.join(rootDir, "school-data");
}

function resolveSafeRoot(value, fallback) {
  const selected = String(value || "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
  const candidate = selected || fallback;
  if (process.platform === "win32" && !path.win32.isAbsolute(candidate)) {
    throw new Error("data_directory_must_be_windows_absolute_path");
  }
  return path.resolve(candidate);
}

const dataRoot = appMode === "school"
  ? resolveSafeRoot(process.env.XINLING_DATA_DIR, defaultSchoolRoot())
  : path.join(rootDir, "data");

const databaseDir = appMode === "school" ? path.join(dataRoot, "database") : dataRoot;
const configDir = appMode === "school" ? path.join(dataRoot, "config") : rootDir;
const backupsDir = appMode === "school" ? path.join(dataRoot, "backups") : path.join(dataRoot, "backups");
const logsDir = appMode === "school" ? path.join(dataRoot, "logs") : path.join(dataRoot, "logs");
const runtimeDir = appMode === "school" ? path.join(dataRoot, "runtime") : path.join(dataRoot, "runtime");
const updatesDir = appMode === "school" ? path.join(dataRoot, "updates") : path.join(dataRoot, "updates");

const databasePath = process.env.CN_DATABASE_PATH
  ? path.resolve(rootDir, process.env.CN_DATABASE_PATH)
  : appMode === "school"
    ? path.join(databaseDir, "xinling-cn.db")
    : path.join(databaseDir, "xinling-cn.local.db");

const appEnvPath = path.join(configDir, "app.env");

function ensureDataDirectories() {
  for (const dir of [dataRoot, databaseDir, configDir, backupsDir, logsDir, runtimeDir, updatesDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function isInside(parent, target) {
  const relative = path.relative(path.resolve(parent), path.resolve(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function safeJoin(parent, name) {
  const target = path.resolve(parent, name);
  if (!isInside(parent, target)) {
    const error = new Error("invalid_path");
    error.statusCode = 400;
    throw error;
  }
  return target;
}

function publicDataRootLabel() {
  return appMode === "school" ? "school-managed-data-directory" : "project-development-data-directory";
}

module.exports = {
  rootDir,
  appMode,
  dataRoot,
  databaseDir,
  databasePath,
  configDir,
  appEnvPath,
  backupsDir,
  logsDir,
  runtimeDir,
  updatesDir,
  ensureDataDirectories,
  isInside,
  safeJoin,
  publicDataRootLabel,
};
