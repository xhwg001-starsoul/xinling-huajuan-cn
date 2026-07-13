const fs = require("node:fs");
const fsp = require("node:fs/promises");
const Database = require("better-sqlite3");
const { getDatabase, closeDatabase, databasePath } = require("./db");
const { requireAdmin, verifyPassword } = require("./authService");
const { getBackupDownload, createBackup } = require("./backupService");

function restoreError(code, statusCode = 400) {
  const error = new Error(code);
  error.statusCode = statusCode;
  return error;
}

function verifySqliteDatabase(filePath) {
  let db;
  try {
    db = new Database(filePath, { readonly: true });
    const integrity = db.prepare("PRAGMA integrity_check").get();
    if (!integrity || Object.values(integrity)[0] !== "ok") throw restoreError("database_integrity_check_failed", 400);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name);
    for (const name of ["organizations", "users", "sessions", "usage_records"]) {
      if (!tables.includes(name)) throw restoreError("invalid_backup_file", 400);
    }
  } finally {
    if (db) db.close();
  }
}

async function restoreFromBackup({ token, backupId, currentPassword, confirmText }) {
  const admin = requireAdmin(token);
  if (!currentPassword) throw restoreError("current_password_required", 400);
  if (String(confirmText || "").trim() !== "\u786e\u8ba4\u6062\u590d") throw restoreError("restore_confirmation_required", 400);

  const db = getDatabase();
  const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(admin.id);
  if (!row || !(await verifyPassword(currentPassword, row.password_hash))) throw restoreError("invalid_current_password", 401);

  const source = getBackupDownload(token, backupId);
  verifySqliteDatabase(source.filePath);
  const before = await createBackup(token, "before-restore");

  const tempTarget = `${databasePath}.restore-next`;
  const rollbackCopy = `${databasePath}.restore-rollback`;
  try {
    await fsp.copyFile(source.filePath, tempTarget);
    verifySqliteDatabase(tempTarget);
    closeDatabase();
    if (fs.existsSync(databasePath)) await fsp.copyFile(databasePath, rollbackCopy);
    await fsp.rename(tempTarget, databasePath);
    const restored = getDatabase();
    restored.prepare("DELETE FROM sessions").run();
    restored.prepare("PRAGMA wal_checkpoint(TRUNCATE)").get();
    return {
      restored: true,
      backupId,
      beforeRestoreBackupId: before.id,
    };
  } catch (error) {
    closeDatabase();
    if (fs.existsSync(rollbackCopy)) {
      await fsp.copyFile(rollbackCopy, databasePath).catch(() => {});
      getDatabase();
      const rollback = restoreError("restore_rollback_completed", 500);
      rollback.causeCode = error?.message || "restore_failed";
      throw rollback;
    }
    throw error;
  } finally {
    await fsp.unlink(tempTarget).catch(() => {});
    await fsp.unlink(rollbackCopy).catch(() => {});
  }
}

module.exports = {
  restoreFromBackup,
  verifySqliteDatabase,
};
