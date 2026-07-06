const { normalizeUsername, isValidUsername, usernameToInternalEmail, readJsonBody, sendJson, requireAdmin } = require("./_supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" });

  try {
    const body = await readJsonBody(req);
    const { supabase, profile } = await requireAdmin(req);
    const username = normalizeUsername(body.username);

    if (!isValidUsername(username)) return sendJson(res, 400, { error: "invalid_username" });
    if (!body.password) return sendJson(res, 400, { error: "missing_password" });

    const { data: existing, error: existingError } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
    if (existingError) throw existingError;
    if (existing) return sendJson(res, 409, { error: "username_exists" });

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: usernameToInternalEmail(username),
      password: body.password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (authError) throw authError;

    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      organization_id: profile.organization_id,
      username,
      display_name: body.displayName || username,
      role: "teacher",
      is_active: true,
    });
    if (profileError) throw profileError;

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("create_teacher_failed", error.message || error);
    return sendJson(res, 500, { error: error.message || "create_teacher_failed" });
  }
};
