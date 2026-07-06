const {
  normalizeUsername,
  isValidUsername,
  usernameToInternalEmail,
  serviceClient,
  readJsonBody,
  sendJson,
} = require("./_supabase");

function describeError(error) {
  if (!error) return "unknown";
  const parts = [
    error.name,
    error.message,
    error.code,
    error.status,
    error.statusCode,
    error.details,
    error.hint,
  ].filter(Boolean);
  return parts.length ? parts.join(" | ") : JSON.stringify(error);
}

function logStepError(step, error) {
  console.error(step, describeError(error));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" });

  try {
    const body = await readJsonBody(req);
    if (!process.env.VITE_SUPABASE_URL) return sendJson(res, 500, { error: "missing_supabase_url" });
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return sendJson(res, 500, { error: "missing_service_role_key" });
    if (!process.env.ADMIN_INIT_CODE) return sendJson(res, 500, { error: "missing_admin_init_code" });
    if (body.initCode !== process.env.ADMIN_INIT_CODE) return sendJson(res, 403, { error: "invalid_init_code" });

    const username = normalizeUsername(body.username);
    if (!isValidUsername(username)) return sendJson(res, 400, { error: "invalid_username" });
    if (!body.password) return sendJson(res, 400, { error: "missing_password" });
    if (!body.organizationName) return sendJson(res, 400, { error: "missing_organization_name" });

    const supabase = serviceClient();
    const { data: existingAdmin, error: adminCheckError } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();
    if (adminCheckError) {
      logStepError("admin_check_failed", adminCheckError);
      return sendJson(res, 500, { error: "admin_check_failed" });
    }
    if (existingAdmin) return sendJson(res, 409, { error: "admin_already_exists" });

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: body.organizationName,
        organization_type: body.organizationType || "",
        usage_scenario: body.usageScenario || "",
        report_signature: body.reportSignature || "",
        note: body.note || "",
      })
      .select("*")
      .single();
    if (orgError) {
      logStepError("organization_insert_failed", orgError);
      return sendJson(res, 500, { error: "organization_insert_failed" });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: usernameToInternalEmail(username),
      password: body.password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (authError) {
      logStepError("supabase_create_user_failed", authError);
      return sendJson(res, 500, { error: "supabase_create_user_failed" });
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      organization_id: org.id,
      username,
      display_name: body.displayName || username,
      role: "admin",
      is_active: true,
    });
    if (profileError) {
      logStepError("profile_insert_failed", profileError);
      return sendJson(res, 500, { error: "profile_insert_failed" });
    }

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    logStepError("bootstrap_admin_failed", error);
    return sendJson(res, 500, { error: describeError(error) || "bootstrap_admin_failed" });
  }
};
