const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const packageJson = require("../package.json");
const { getDatabase } = require("./db");
const { requireAdmin } = require("./authService");
const { backupsDir, safeJoin } = require("./dataPaths");
const Database = require("better-sqlite3");

const backupVersion = 1;
const maxImportBytes = 512 * 1024 * 1024;
const databaseBackupDir = path.join(backupsDir, "database");
const importTempDir = path.join(backupsDir, "tmp");

function backupError(code, statusCode = 400) {
  const error = new Error(code);
  error.statusCode = statusCode;
  return error;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");
}

function backupBaseName() {
  return `xinling-db-${timestamp()}-v${packageJson.version}`;
}

function backupTypeFor(reason) {
  const value = String(reason || "manual").trim().toLowerCase();
  if (value === "before-restore" || value === "pre-restore") return "pre-restore";
  if (value === "imported") return "imported";
  return "manual";
}

function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function safeBackupId(id) {
  const value = String(id || "").trim();
  if (!/^xinling-db-[a-zA-Z0-9._-]+\.db$/.test(value)) throw backupError("invalid_backup_id", 400);
  return value;
}

function metadataPathFor(dbFileName) {
  return safeJoin(databaseBackupDir, dbFileName.replace(/\.db$/i, ".json"));
}

function dbPathFor(dbFileName) {
  return safeJoin(databaseBackupDir, dbFileName);
}

function verifySqliteBackupFile(filePath) {
  const stat = fs.statSync(filePath);
  if (!stat.size || stat.size > maxImportBytes) throw backupError("invalid_backup_file_size", 400);
  const header = Buffer.alloc(16);
  const fd = fs.openSync(filePath, "r");
  try {
    fs.readSync(fd, header, 0, 16, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (header.toString("ascii") !== "SQLite format 3\u0000") throw backupError("invalid_sqlite_header", 400);

  let db;
  try {
    db = new Database(filePath, { readonly: true, fileMustExist: true });
    const integrity = db.prepare("PRAGMA integrity_check").get();
    if (!integrity || Object.values(integrity)[0] !== "ok") throw backupError("database_integrity_check_failed", 400);
    const tableRows = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tables = new Set(tableRows.map((row) => row.name));
    const requiredTables = ["organizations", "users", "sessions", "usage_records"];
    for (const table of requiredTables) {
      if (!tables.has(table)) throw backupError("invalid_backup_file", 400);
    }
    const requiredColumns = {
      organizations: ["id", "name"],
      users: ["id", "username", "role", "password_hash"],
      sessions: ["id", "user_id", "token_hash"],
      usage_records: ["id", "created_at"],
    };
    for (const [table, columns] of Object.entries(requiredColumns)) {
      const existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name));
      for (const column of columns) {
        if (!existing.has(column)) throw backupError("invalid_backup_file", 400);
      }
    }
    const sourceSchemaVersion = db.prepare("PRAGMA user_version").get().user_version || 0;
    const currentSchemaVersion = getDatabase().prepare("PRAGMA user_version").get().user_version || 0;
    if (sourceSchemaVersion > currentSchemaVersion) throw backupError("incompatible_schema_version", 400);
    return { schemaVersion: sourceSchemaVersion, databaseSize: stat.size };
  } finally {
    if (db) db.close();
  }
}

async function createBackup(token, reason = "manual") {
  requireAdmin(token);
  fs.mkdirSync(databaseBackupDir, { recursive: true });
  const base = backupBaseName();
  const dbFileName = `${base}.db`;
  const target = dbPathFor(dbFileName);
  if (fs.existsSync(target)) throw backupError("backup_file_exists", 409);

  await getDatabase().backup(target);
  const stat = fs.statSync(target);
  const sha256 = sha256File(target);
  const metadata = {
    id: dbFileName,
    backupVersion,
    applicationVersion: packageJson.version,
    schemaVersion: getDatabase().prepare("PRAGMA user_version").get().user_version || 0,
    backupType: backupTypeFor(reason),
    reason: String(reason || "manual").slice(0, 40),
    createdAt: new Date().toISOString(),
    databaseSize: stat.size,
    sha256,
  };
  await fsp.writeFile(metadataPathFor(dbFileName), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  return metadata;
}

function readMetadata(dbFileName) {
  const metaPath = metadataPathFor(dbFileName);
  if (!fs.existsSync(metaPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf8"));
  } catch {
    return null;
  }
}

function listBackups(token) {
  requireAdmin(token);
  fs.mkdirSync(databaseBackupDir, { recursive: true });
  return fs.readdirSync(databaseBackupDir)
    .filter((name) => /^xinling-db-.+\.db$/i.test(name))
    .map((name) => {
      const filePath = dbPathFor(name);
      const stat = fs.statSync(filePath);
      const actualSha256 = sha256File(filePath);
      const metadata = readMetadata(name) || {};
      const sha256Status = metadata.sha256 ? (metadata.sha256 === actualSha256 ? "verified" : "mismatch") : "generated";
      return {
        id: metadata.id || name,
        fileName: name,
        backupVersion: metadata.backupVersion || backupVersion,
        applicationVersion: metadata.applicationVersion || "",
        schemaVersion: metadata.schemaVersion || 0,
        backupType: metadata.backupType || backupTypeFor(metadata.reason),
        reason: metadata.reason || "manual",
        createdAt: metadata.createdAt || stat.mtime.toISOString(),
        databaseSize: metadata.databaseSize || stat.size,
        sha256: metadata.sha256 || actualSha256,
        sha256Status,
      };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function getBackupDownload(token, id) {
  requireAdmin(token);
  const safeId = safeBackupId(id);
  const filePath = dbPathFor(safeId);
  if (!fs.existsSync(filePath)) throw backupError("backup_not_found", 404);
  return {
    filePath,
    fileName: safeId,
    size: fs.statSync(filePath).size,
  };
}

async function deleteBackup(token, id) {
  requireAdmin(token);
  const safeId = safeBackupId(id);
  const filePath = dbPathFor(safeId);
  if (!fs.existsSync(filePath)) throw backupError("backup_not_found", 404);
  await fsp.unlink(filePath);
  await fsp.unlink(metadataPathFor(safeId)).catch(() => {});
  return { id: safeId };
}

async function importBackupFile(token, tempFilePath) {
  requireAdmin(token);
  fs.mkdirSync(databaseBackupDir, { recursive: true });
  fs.mkdirSync(importTempDir, { recursive: true });
  try {
    const validation = verifySqliteBackupFile(tempFilePath);
    const base = `xinling-db-${timestamp()}-imported-v${packageJson.version}`;
    let dbFileName = `${base}.db`;
    let target = dbPathFor(dbFileName);
    let suffix = 1;
    while (fs.existsSync(target)) {
      dbFileName = `${base}-${suffix}.db`;
      target = dbPathFor(dbFileName);
      suffix += 1;
    }
    await fsp.copyFile(tempFilePath, target);
    const stat = fs.statSync(target);
    const sha256 = sha256File(target);
    const metadata = {
      id: dbFileName,
      fileName: dbFileName,
      backupVersion,
      applicationVersion: packageJson.version,
      schemaVersion: validation.schemaVersion,
      backupType: "imported",
      reason: "imported",
      createdAt: new Date().toISOString(),
      databaseSize: stat.size,
      sha256,
      sha256Status: "verified",
    };
    await fsp.writeFile(metadataPathFor(dbFileName), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    return metadata;
  } finally {
    await fsp.unlink(tempFilePath).catch(() => {});
  }
}

async function createCommandLineBackup() {
  fs.mkdirSync(databaseBackupDir, { recursive: true });
  const base = backupBaseName();
  const dbFileName = `${base}.db`;
  const target = dbPathFor(dbFileName);
  await getDatabase().backup(target);
  const stat = fs.statSync(target);
  const sha256 = sha256File(target);
  const metadata = {
    id: dbFileName,
    backupVersion,
    applicationVersion: packageJson.version,
    schemaVersion: getDatabase().prepare("PRAGMA user_version").get().user_version || 0,
    backupType: "manual",
    reason: "command-line",
    createdAt: new Date().toISOString(),
    databaseSize: stat.size,
    sha256,
  };
  await fsp.writeFile(metadataPathFor(dbFileName), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  return { metadata, filePath: target };
}

module.exports = {
  databaseBackupDir,
  createBackup,
  listBackups,
  getBackupDownload,
  deleteBackup,
  importBackupFile,
  importTempDir,
  maxImportBytes,
  safeBackupId,
  verifySqliteBackupFile,
  createCommandLineBackup,
};
