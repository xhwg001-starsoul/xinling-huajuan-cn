const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const databasePath = path.join(dataDir, "xinling-cn.local.db");

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

    CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

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
      created_at TEXT NOT NULL,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS usage_records_org_created_idx ON usage_records(organization_id, created_at);
    CREATE INDEX IF NOT EXISTS usage_records_user_created_idx ON usage_records(user_id, created_at);
  `);
}

function getDatabase() {
  if (database) return database;
  fs.mkdirSync(dataDir, { recursive: true });
  database = new Database(databasePath);
  database.pragma("foreign_keys = ON");
  database.pragma("journal_mode = WAL");
  database.pragma("busy_timeout = 5000");
  initializeSchema(database);
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
};
