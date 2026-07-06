const { readJsonBody, sendJson, requireAdmin } = require("./_supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" });

  try {
    const body = await readJsonBody(req);
    const { supabase, profile } = await requireAdmin(req);
    const userId = String(body.userId || "").trim();
    const newPassword = String(body.newPassword || "");

    if (!userId) return sendJson(res, 400, { error: "target_user_not_found" });
    if (newPassword.length < 8) return sendJson(res, 400, { error: "password_too_short" });
    if (userId === profile.id) return sendJson(res, 400, { error: "cannot_reset_self" });

    const { data: target, error: targetError } = await supabase
      .from("profiles")
      .select("id, organization_id, role")
      .eq("id", userId)
      .maybeSingle();

    if (targetError) {
      console.error("reset_password_profile_lookup_failed", targetError.message || targetError);
      return sendJson(res, 500, { error: "reset_password_failed" });
    }
    if (!target) return sendJson(res, 404, { error: "target_user_not_found" });
    if (target.organization_id !== profile.organization_id) return sendJson(res, 403, { error: "different_organization" });
    if (target.role !== "teacher") return sendJson(res, 400, { error: "cannot_reset_self" });

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (updateError) {
      console.error("reset_password_auth_update_failed", updateError.message || updateError);
      return sendJson(res, 500, { error: "reset_password_failed" });
    }

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("admin_reset_password_failed", error.message || error);
    const message = error.message === "admin_required" ? "not_admin" : error.message || "reset_password_failed";
    return sendJson(res, 500, { error: message });
  }
};
