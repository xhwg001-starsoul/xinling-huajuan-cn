const crypto = require("node:crypto");
const { getDatabase } = require("./db");
const { requireReadyUser } = require("./authService");

function safeText(value, maxLength = 120) {
  return String(value || "").trim().slice(0, maxLength);
}

function validDate(value) {
  const text = safeText(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function normalizedFilters(user, input = {}) {
  return {
    dateFrom: validDate(input.dateFrom),
    dateTo: validDate(input.dateTo),
    userId: user.role === "admin" ? safeText(input.userId, 80) : user.id,
    contentType: safeText(input.contentType, 120),
  };
}

function whereClause(user, filters) {
  const clauses = ["organization_id = ?"];
  const params = [user.organizationId];
  if (filters.userId) {
    clauses.push("user_id = ?");
    params.push(filters.userId);
  }
  if (filters.contentType) {
    clauses.push("content_type = ?");
    params.push(filters.contentType);
  }
  if (filters.dateFrom) {
    clauses.push("date(created_at) >= date(?)");
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    clauses.push("date(created_at) <= date(?)");
    params.push(filters.dateTo);
  }
  return { sql: clauses.join(" AND "), params };
}

function recordUsage({ user, contentType, modelConfig }) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const type = safeText(contentType || "未指定", 120) || "未指定";
  db.prepare(`
    INSERT INTO usage_records (
      id, organization_id, user_id, username, teacher_alias, user_role, content_type,
      is_risk_related, pipeline_mode, vision_provider, vision_model, text_provider,
      text_model, single_provider, single_model, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    user.organizationId,
    user.id,
    safeText(user.username, 32),
    safeText(user.displayName, 80),
    user.role === "admin" ? "admin" : "teacher",
    type,
    type === "风险提示与转介建议" ? 1 : 0,
    safeText(modelConfig.pipelineMode, 20),
    safeText(modelConfig.visionProvider, 40),
    safeText(modelConfig.visionModel, 120),
    safeText(modelConfig.textProvider, 40),
    safeText(modelConfig.textModel, 120),
    safeText(modelConfig.singleProvider, 40),
    safeText(modelConfig.singleModel, 120),
    now,
  );
}

function safeRecord(row) {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    teacherAlias: row.teacher_alias,
    userRole: row.user_role,
    contentType: row.content_type,
    isRiskRelated: row.is_risk_related === 1,
    pipelineMode: row.pipeline_mode,
    visionProvider: row.vision_provider,
    visionModel: row.vision_model,
    textProvider: row.text_provider,
    textModel: row.text_model,
    singleProvider: row.single_provider,
    singleModel: row.single_model,
    createdAt: row.created_at,
  };
}

function usageSummary({ token, filters: rawFilters = {} }) {
  const user = requireReadyUser(token);
  const filters = normalizedFilters(user, rawFilters);
  const where = whereClause(user, filters);
  const db = getDatabase();
  const totalCount = db.prepare(`SELECT COUNT(*) count FROM usage_records WHERE ${where.sql}`).get(...where.params).count;
  const todayCount = db.prepare(`SELECT COUNT(*) count FROM usage_records WHERE ${where.sql} AND date(created_at) = date('now', 'localtime')`).get(...where.params).count;
  const riskRelatedCount = db.prepare(`SELECT COUNT(*) count FROM usage_records WHERE ${where.sql} AND is_risk_related = 1`).get(...where.params).count;

  const contentTypeCounts = {};
  for (const row of db.prepare(`SELECT content_type, COUNT(*) count FROM usage_records WHERE ${where.sql} GROUP BY content_type ORDER BY count DESC`).all(...where.params)) {
    contentTypeCounts[row.content_type] = row.count;
  }

  const providerCounts = {};
  for (const row of db.prepare(`
    SELECT pipeline_mode, vision_provider, vision_model, text_provider, text_model, single_provider, single_model, COUNT(*) count
    FROM usage_records WHERE ${where.sql}
    GROUP BY pipeline_mode, vision_provider, vision_model, text_provider, text_model, single_provider, single_model
    ORDER BY count DESC
  `).all(...where.params)) {
    const label = row.pipeline_mode === "split"
      ? `${row.vision_provider || "-"}/${row.vision_model || "-"} → ${row.text_provider || "-"}/${row.text_model || "-"}`
      : `${row.single_provider || "-"}/${row.single_model || "-"}`;
    providerCounts[label] = (providerCounts[label] || 0) + row.count;
  }

  const teacherCounts = {};
  if (user.role === "admin") {
    for (const row of db.prepare(`
      SELECT user_id, username, teacher_alias, COUNT(*) count
      FROM usage_records WHERE ${where.sql}
      GROUP BY user_id, username, teacher_alias ORDER BY count DESC
    `).all(...where.params)) {
      teacherCounts[row.user_id] = { username: row.username, displayName: row.teacher_alias, count: row.count };
    }
  }

  return {
    todayCount,
    totalCount,
    riskRelatedCount,
    contentTypeCounts,
    teacherCounts,
    providerCounts,
    recentCount: Math.min(totalCount, 100),
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  };
}

function usageRecords({ token, filters: rawFilters = {}, limit, offset }) {
  const user = requireReadyUser(token);
  const filters = normalizedFilters(user, rawFilters);
  const where = whereClause(user, filters);
  const safeLimit = Math.min(Math.max(Number.parseInt(limit || "20", 10) || 20, 1), 100);
  const safeOffset = Math.max(Number.parseInt(offset || "0", 10) || 0, 0);
  const rows = getDatabase().prepare(`
    SELECT * FROM usage_records
    WHERE ${where.sql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...where.params, safeLimit, safeOffset);
  return { records: rows.map(safeRecord), limit: safeLimit, offset: safeOffset, filters };
}

module.exports = {
  recordUsage,
  usageSummary,
  usageRecords,
};
