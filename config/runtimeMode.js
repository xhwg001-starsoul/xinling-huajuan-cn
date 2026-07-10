function hasSupabaseEnv() {
  return Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);
}

function getRuntimeMode() {
  const appRegion = String(process.env.APP_REGION || "cn").trim().toLowerCase();
  const configuredAuthProvider = String(process.env.AUTH_PROVIDER || "").trim().toLowerCase();
  const authProvider = configuredAuthProvider || (hasSupabaseEnv() ? "supabase" : "cn-dev");
  const settingsProvider = String(process.env.SETTINGS_PROVIDER || "file").trim().toLowerCase();

  return {
    appRegion,
    authProvider,
    settingsProvider,
    isCnDev: appRegion === "cn" && authProvider === "cn-dev",
    hasSupabaseEnv: hasSupabaseEnv(),
  };
}

module.exports = {
  getRuntimeMode,
  hasSupabaseEnv,
};
