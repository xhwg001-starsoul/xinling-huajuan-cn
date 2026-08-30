const fs = require("node:fs");
const Database = require("better-sqlite3");
const { databaseDir, databasePath, ensureDataDirectories } = require("./dataPaths");

let database;

function initializeSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      organization_type TEXT NOT NULL DEFAULT '',
      usage_scenario TEXT NOT NULL DEFAULT '',
      report_signature TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      username TEXT NOT NULL COLLATE NOCASE UNIQUE,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'teacher')),
      password_hash TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0, 1)),
      password_updated_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      user_agent TEXT NOT NULL DEFAULT '',
      ip_hint TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS usage_records (
      id TEXT PRIMARY KEY,
      organization_id TEXT,
      user_id TEXT,
      username TEXT NOT NULL DEFAULT '',
      teacher_alias TEXT NOT NULL DEFAULT '',
      user_role TEXT NOT NULL DEFAULT '',
      content_type TEXT NOT NULL DEFAULT '',
      is_risk_related INTEGER NOT NULL DEFAULT 0 CHECK (is_risk_related IN (0, 1)),
      pipeline_mode TEXT NOT NULL DEFAULT '',
      vision_provider TEXT NOT NULL DEFAULT '',
      vision_model TEXT NOT NULL DEFAULT '',
      text_provider TEXT NOT NULL DEFAULT '',
      text_model TEXT NOT NULL DEFAULT '',
      single_provider TEXT NOT NULL DEFAULT '',
      single_model TEXT NOT NULL DEFAULT '',
      analysis_mode TEXT NOT NULL DEFAULT 'legacy_dual_model',
      provider TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS system_model_settings (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL UNIQUE,
      pipeline_mode TEXT NOT NULL CHECK (pipeline_mode IN ('single', 'split')),
      single_provider TEXT NOT NULL DEFAULT 'openai',
      single_model TEXT NOT NULL DEFAULT '',
      vision_provider TEXT NOT NULL DEFAULT 'qwen',
      vision_model TEXT NOT NULL DEFAULT '',
      text_provider TEXT NOT NULL DEFAULT 'deepseek',
      text_model TEXT NOT NULL DEFAULT '',
      analysis_mode TEXT NOT NULL DEFAULT 'legacy_dual_model',
      multimodal_provider TEXT NOT NULL DEFAULT 'qwen',
      multimodal_model TEXT NOT NULL DEFAULT 'qwen3.8-max',
      allow_teacher_model_selection INTEGER NOT NULL DEFAULT 0 CHECK (allow_teacher_model_selection IN (0, 1)),
      updated_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

  `);
}

function ensureColumn(db, tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (columns.some((column) => column.name === columnName)) return;
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

function runMigrations(db) {
  ensureColumn(db, "organizations", "name", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "organizations", "organization_type", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "organizations", "usage_scenario", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "organizations", "report_signature", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "organizations", "note", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "organizations", "created_at", "TEXT");
  ensureColumn(db, "organizations", "updated_at", "TEXT");
  ensureColumn(db, "users", "must_change_password", "INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0, 1))");
  ensureColumn(db, "users", "password_updated_at", "TEXT");
  ensureColumn(db, "users", "updated_at", "TEXT");
  ensureColumn(db, "usage_records", "organization_id", "TEXT");
  ensureColumn(db, "usage_records", "user_id", "TEXT");
  ensureColumn(db, "usage_records", "username", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "usage_records", "teacher_alias", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "usage_records", "user_role", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "usage_records", "content_type", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "usage_records", "is_risk_related", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "usage_records", "pipeline_mode", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "usage_records", "vision_provider", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "usage_records", "vision_model", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "usage_records", "text_provider", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "usage_records", "text_model", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "usage_records", "single_provider", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "usage_records", "single_model", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "usage_records", "analysis_mode", "TEXT NOT NULL DEFAULT 'legacy_dual_model'");
  ensureColumn(db, "usage_records", "provider", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "usage_records", "model", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "usage_records", "created_at", "TEXT");
  ensureColumn(db, "system_model_settings", "organization_id", "TEXT");
  ensureColumn(db, "system_model_settings", "pipeline_mode", "TEXT NOT NULL DEFAULT 'split'");
  ensureColumn(db, "system_model_settings", "single_provider", "TEXT NOT NULL DEFAULT 'openai'");
  ensureColumn(db, "system_model_settings", "single_model", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "system_model_settings", "vision_provider", "TEXT NOT NULL DEFAULT 'qwen'");
  ensureColumn(db, "system_model_settings", "vision_model", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "system_model_settings", "text_provider", "TEXT NOT NULL DEFAULT 'deepseek'");
  ensureColumn(db, "system_model_settings", "text_model", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "system_model_settings", "analysis_mode", "TEXT NOT NULL DEFAULT 'legacy_dual_model'");
  ensureColumn(db, "system_model_settings", "multimodal_provider", "TEXT NOT NULL DEFAULT 'qwen'");
  ensureColumn(db, "system_model_settings", "multimodal_model", "TEXT NOT NULL DEFAULT 'qwen3.8-max'");
  ensureColumn(db, "system_model_settings", "allow_teacher_model_selection", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "system_model_settings", "updated_by", "TEXT");
  ensureColumn(db, "system_model_settings", "created_at", "TEXT");
  ensureColumn(db, "system_model_settings", "updated_at", "TEXT");
  db.prepare("UPDATE users SET must_change_password = 0 WHERE must_change_password = 1").run();
  db.prepare("UPDATE users SET updated_at = COALESCE(updated_at, created_at)").run();
  db.prepare("UPDATE organizations SET updated_at = COALESCE(updated_at, created_at)").run();
  db.exec(`
    CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS usage_records_org_created_idx ON usage_records(organization_id, created_at);
    CREATE INDEX IF NOT EXISTS usage_records_user_created_idx ON usage_records(user_id, created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS system_model_settings_org_idx ON system_model_settings(organization_id);
  `);
}

function getDatabase() {
  if (database) return database;
  ensureDataDirectories();
  fs.mkdirSync(databaseDir, { recursive: true });
  database = new Database(databasePath);
  database.pragma("foreign_keys = ON");
  database.pragma("journal_mode = WAL");
  database.pragma("busy_timeout = 5000");
  initializeSchema(database);
  runMigrations(database);
  return database;
}

function closeDatabase() {
  if (!database) return;
  database.close();
  database = undefined;
}

module.exports = {
  databasePath,
  getDatabase,
  closeDatabase,
  runMigrations,
};
