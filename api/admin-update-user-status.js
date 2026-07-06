const { readJsonBody, sendJson, requireAdmin } = require("./_supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" });

  try {
    const body = await readJsonBody(req);
    const { supabase, profile } = await requireAdmin(req);
    const userId = String(body.userId || "").trim();
    const isActive = body.isActive === true;

    if (!userId) return sendJson(res, 400, { error: "missing_user_id" });
    if (userId === profile.id && !isActive) return sendJson(res, 400, { error: "cannot_disable_self" });

    const { data: target, error: targetError } = await supabase
      .from("profiles")
      .select("id, organization_id, role")
      .eq("id", userId)
      .maybeSingle();

    if (targetError) throw targetError;
    if (!target || target.organization_id !== profile.organization_id) {
      return sendJson(res, 404, { error: "user_not_found" });
    }
    if (target.role === "admin" && !isActive) {
      return sendJson(res, 400, { error: "cannot_disable_admin" });
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .eq("organization_id", profile.organization_id);

    if (updateError) throw updateError;
    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("update_user_status_failed", error);
    return sendJson(res, 500, { error: error.message || "update_user_status_failed" });
  }
};
