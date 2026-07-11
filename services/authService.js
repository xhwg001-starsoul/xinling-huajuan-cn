const crypto = require("node:crypto");
const { promisify } = require("node:util");
const { getDatabase } = require("./db");

const scryptAsync = promisify(crypto.scrypt);
const USERNAME_PATTERN = /^[a-z0-9_-]{3,32}$/;

function authError(code, statusCode = 400) {
  const error = new Error(code);
  error.statusCode = statusCode;
  return error;
}

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function validateUsername(value) {
  const username = normalizeUsername(value);
  if (!USERNAME_PATTERN.test(username)) throw authError("invalid_username");
  return username;
}

function validatePassword(password) {
  const value = String(password || "");
  if (value.length < 8) throw authError("password_too_short");
  if (value.length > 256) throw authError("password_too_long");
  return value;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scryptAsync(validatePassword(password), salt, 64);
  return `scrypt$v1$${salt.toString("base64url")}$${Buffer.from(derived).toString("base64url")}`;
}

async function verifyPassword(password, encodedHash) {
  const parts = String(encodedHash || "").split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt" || parts[1] !== "v1") return false;
  try {
    const salt = Buffer.from(parts[2], "base64url");
    const expected = Buffer.from(parts[3], "base64url");
    const actual = Buffer.from(await scryptAsync(String(password || ""), salt, expected.length));
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function sessionSecret() {
  const secret = String(process.env.CN_SESSION_SECRET || "");
  if (!secret) throw authError("cn_session_secret_missing", 500);
  return secret;
}

function hashSessionToken(token) {
  return crypto.createHmac("sha256", sessionSecret()).update(String(token || "")).digest("hex");
}

function sessionExpiresDays() {
  const configured = Number.parseInt(process.env.CN_SESSION_EXPIRES_DAYS || "7", 10);
  return Number.isFinite(configured) && configured >= 1 && configured <= 30 ? configured : 7;
}

function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    organizationId: row.organization_id,
  };
}

function requestMetadata(req = {}) {
  const userAgent = String(req.headers?.["user-agent"] || "").slice(0, 255);
  const forwarded = String(req.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  const address = forwarded || req.socket?.remoteAddress || "";
  const ipHint = address
    ? crypto.createHmac("sha256", sessionSecret()).update(address).digest("hex").slice(0, 16)
    : "";
  return { userAgent, ipHint };
}

async function bootstrapAdmin({ initCode, organizationName, username, displayName, password }) {
  if (!process.env.CN_ADMIN_INIT_CODE) throw authError("cn_admin_init_code_missing", 500);
  const suppliedCodeHash = crypto.createHash("sha256").update(String(initCode || "")).digest();
  const configuredCodeHash = crypto.createHash("sha256").update(String(process.env.CN_ADMIN_INIT_CODE)).digest();
  if (!crypto.timingSafeEqual(suppliedCodeHash, configuredCodeHash)) {
    throw authError("invalid_cn_admin_init_code", 403);
  }

  const safeUsername = validateUsername(username);
  const safePassword = validatePassword(password);
  const safeOrganizationName = String(organizationName || "").trim().slice(0, 120);
  if (!safeOrganizationName) throw authError("missing_organization_name");
  const safeDisplayName = String(displayName || safeUsername).trim().slice(0, 80) || safeUsername;
  const passwordHash = await hashPassword(safePassword);
  const db = getDatabase();

  const create = db.transaction(() => {
    const existingAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
    if (existingAdmin) throw authError("admin_already_exists", 409);
    const existingUsername = db.prepare("SELECT id FROM users WHERE username = ? LIMIT 1").get(safeUsername);
    if (existingUsername) throw authError("username_exists", 409);

    const now = new Date().toISOString();
    const organizationId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO organizations (id, name, organization_type, usage_scenario, report_signature, note, created_at, updated_at)
      VALUES (?, ?, '', '', '', '', ?, ?)
    `).run(organizationId, safeOrganizationName, now, now);
    db.prepare(`
      INSERT INTO users (id, organization_id, username, display_name, role, password_hash, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'admin', ?, 1, ?, ?)
    `).run(userId, organizationId, safeUsername, safeDisplayName, passwordHash, now, now);
    return { id: userId, username: safeUsername, display_name: safeDisplayName, role: "admin", organization_id: organizationId };
  });

  return publicUser(create());
}

async function login({ username, password, req }) {
  const safeUsername = validateUsername(username);
  const db = getDatabase();
  const user = db.prepare("SELECT * FROM users WHERE username = ? LIMIT 1").get(safeUsername);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw authError("invalid_username_or_password", 401);
  }
  if (!user.is_active) throw authError("account_disabled", 403);

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const expiresAt = new Date(nowDate.getTime() + sessionExpiresDays() * 24 * 60 * 60 * 1000).toISOString();
  const metadata = requestMetadata(req);

  db.transaction(() => {
    db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
    db.prepare(`
      INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, last_seen_at, user_agent, ip_hint)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), user.id, tokenHash, now, expiresAt, now, metadata.userAgent, metadata.ipHint);
    db.prepare("UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?").run(now, now, user.id);
  })();

  return { token, expiresAt, user: publicUser(user) };
}

function requireCurrentUser(token) {
  if (!token) throw authError("not_logged_in", 401);
  const db = getDatabase();
  const tokenHash = hashSessionToken(token);
  const row = db.prepare(`
    SELECT s.id AS session_id, s.expires_at, u.*
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
    LIMIT 1
  `).get(tokenHash);
  if (!row) throw authError("not_logged_in", 401);

  const now = new Date().toISOString();
  if (row.expires_at <= now) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(row.session_id);
    throw authError("session_expired", 401);
  }
  if (!row.is_active) throw authError("account_disabled", 403);
  db.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").run(now, row.session_id);
  return publicUser(row);
}

function logout(token) {
  if (!token) return;
  const db = getDatabase();
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashSessionToken(token));
}

function getAuthStatus() {
  const db = getDatabase();
  const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  return { hasAdmin: Boolean(admin), authProvider: "cn-dev" };
}

module.exports = {
  bootstrapAdmin,
  login,
  requireCurrentUser,
  logout,
  getAuthStatus,
  normalizeUsername,
  validateUsername,
  hashPassword,
  verifyPassword,
};
