const { getDatabase } = require("./db");
const { requireReadyUser, requireAdmin } = require("./authService");

function organizationError(code, statusCode = 400) {
  const error = new Error(code);
  error.statusCode = statusCode;
  return error;
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function organizationSummary(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    organizationType: row.organization_type || "",
    usageScenario: row.usage_scenario || "",
    reportSignature: row.report_signature || "",
    note: row.note || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

function getOrganization(token) {
  const user = requireReadyUser(token);
  const row = getDatabase().prepare("SELECT * FROM organizations WHERE id = ?").get(user.organizationId);
  if (!row) throw organizationError("organization_not_found", 404);
  return organizationSummary(row);
}

function updateOrganization({ token, name, organizationType, usageScenario, reportSignature, note }) {
  const admin = requireAdmin(token);
  const safeName = cleanText(name, 120);
  if (!safeName) throw organizationError("organization_name_required");
  const values = {
    organizationType: cleanText(organizationType, 60),
    usageScenario: cleanText(usageScenario, 120),
    reportSignature: cleanText(reportSignature, 120),
    note: cleanText(note, 500),
  };
  const now = new Date().toISOString();
  const db = getDatabase();
  const result = db.prepare(`
    UPDATE organizations
    SET name = ?, organization_type = ?, usage_scenario = ?, report_signature = ?, note = ?, updated_at = ?
    WHERE id = ?
  `).run(safeName, values.organizationType, values.usageScenario, values.reportSignature, values.note, now, admin.organizationId);
  if (!result.changes) throw organizationError("organization_not_found", 404);
  return organizationSummary(db.prepare("SELECT * FROM organizations WHERE id = ?").get(admin.organizationId));
}

module.exports = {
  getOrganization,
  updateOrganization,
  organizationSummary,
};
