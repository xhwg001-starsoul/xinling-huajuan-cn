const { createClient } = require("@supabase/supabase-js");
const { getRuntimeMode } = require("../config/runtimeMode");

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidUsername(username) {
  return /^[a-z0-9_-]{3,32}$/.test(username);
}

function usernameToInternalEmail(username) {
  return `${normalizeUsername(username)}@xinlinghuajuan.invalid`;
}

function serviceClient() {
  if (!process.env.VITE_SUPABASE_URL) throw new Error("missing_supabase_url");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("missing_service_role_key");
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function hasSupabaseConfig() {
  const runtime = getRuntimeMode();
  return runtime.authProvider !== "cn-dev" && Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function getBearerToken(req) {
  const value = req.headers.authorization || req.headers.Authorization || "";
  const text = String(value);
  return text.toLowerCase().startsWith("bearer ") ? text.slice(7).trim() : "";
}

async function getAuthUserFromToken(token) {
  if (!process.env.VITE_SUPABASE_URL) throw new Error("missing_supabase_url");
  if (!process.env.VITE_SUPABASE_ANON_KEY) throw new Error("missing_supabase_anon_key");

  const response = await fetch(`${process.env.VITE_SUPABASE_URL.replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      apikey: process.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("auth_token_verify_failed", response.status, detail.slice(0, 200));
    throw new Error("invalid_login_state");
  }

  const user = await response.json().catch(() => null);
  if (!user?.id) throw new Error("invalid_login_state");
  return user;
}

async function requireActiveProfile(req) {
  const supabase = serviceClient();
  const token = getBearerToken(req);
  if (!token) throw new Error("missing_login_token");
  const user = await getAuthUserFromToken(token);
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error || !profile) {
    console.error("profile_lookup_failed", error?.message || error || "not_found");
    throw new Error("profile_not_found");
  }
  if (!profile.is_active) throw new Error("account_disabled");
  return { supabase, user, profile };
}

async function requireActiveProfileIfConfigured(req) {
  if (!hasSupabaseConfig()) {
    return {
      supabase: null,
      user: null,
      profile: null,
      skipped: true,
    };
  }
  return requireActiveProfile(req);
}

async function requireAdmin(req) {
  const context = await requireActiveProfile(req);
  if (context.profile.role !== "admin") throw new Error("admin_required");
  return context;
}

module.exports = {
  normalizeUsername,
  isValidUsername,
  usernameToInternalEmail,
  serviceClient,
  hasSupabaseConfig,
  readJsonBody,
  sendJson,
  getBearerToken,
  getAuthUserFromToken,
  requireActiveProfile,
  requireActiveProfileIfConfigured,
  requireAdmin,
};
