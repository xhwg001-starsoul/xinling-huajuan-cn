const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { getDatabase } = require("./db");
const { requireAdmin } = require("./authService");
const { normalizeModelConfig } = require("../config/modelDefaults");

const rootDir = path.resolve(__dirname, "..");
const legacySettingsFilePath = path.join(rootDir, "data", "model-settings.local.json");
const providers = new Set(["openai", "qwen", "deepseek", "doubao"]);
const singleProviders = new Set(["openai", "qwen", "doubao"]);
const visionProviders = new Set(["openai", "qwen", "doubao"]);
const textProviders = new Set(["openai", "deepseek", "qwen", "doubao"]);
const multimodalProviders = new Set(["openai", "qwen", "deepseek"]);
const forbiddenKeyPattern = /(?:apiKey|api_key|secret|token|password)/i;
const modelNamePattern = /^[a-zA-Z0-9._:/@+-]{1,120}$/;

function serviceError(code, statusCode = 400) {
  const error = new Error(code);
  error.statusCode = statusCode;
  return error;
}

function assertNoForbiddenFields(value) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeyPattern.test(key)) throw serviceError("model_settings_forbidden_field", 400);
    if (child && typeof child === "object") assertNoForbiddenFields(child);
  }
}

function safeModelName(value, fallback) {
  const text = String(value || fallback || "").trim();
  if (!text) return String(fallback || "").trim();
  if (!modelNamePattern.test(text)) throw serviceError("invalid_model_name", 400);
  return text;
}

function safeProvider(value, allowed, fallback) {
  const provider = String(value || fallback || "").trim().toLowerCase();
  if (!providers.has(provider) || !allowed.has(provider)) throw serviceError("invalid_model_provider", 400);
  return provider;
}

function sanitizeSettings(input = {}) {
  assertNoForbiddenFields(input);
  const defaults = normalizeModelConfig({});
  const pipelineMode = ["single", "split"].includes(input.pipelineMode) ? input.pipelineMode : defaults.pipelineMode;
  const analysisMode = ["single_multimodal", "legacy_dual_model"].includes(input.analysisMode)
    ? input.analysisMode
    : defaults.analysisMode;
  const multimodalProvider = safeProvider(input.multimodalProvider, multimodalProviders, defaults.multimodalProvider);
  const multimodalModelFallback = multimodalProvider === "deepseek"
    ? process.env.DEEPSEEK_VISION_MODEL || "deepseek-v4-flash-vision-exp"
    : multimodalProvider === "openai"
      ? input.singleModel || defaults.singleModel
      : process.env.QWEN_MULTIMODAL_MODEL || "qwen3.8-max";
  return {
    analysisMode,
    multimodalProvider,
    multimodalModel: safeModelName(input.multimodalModel, multimodalModelFallback),
    allowTeacherModelSelection: input.allowTeacherModelSelection === true || input.allowTeacherModelSelection === 1,
    knowledgeBaseEnabled: input.knowledgeBaseEnabled !== false && input.knowledgeBaseEnabled !== 0,
    pipelineMode,
    singleProvider: safeProvider(input.singleProvider, singleProviders, defaults.singleProvider),
    singleModel: safeModelName(input.singleModel, defaults.singleModel),
    visionProvider: safeProvider(input.visionProvider, visionProviders, defaults.visionProvider),
    visionModel: safeModelName(input.visionModel, defaults.visionModel),
    textProvider: safeProvider(input.textProvider, textProviders, defaults.textProvider),
    textModel: safeModelName(input.textModel, defaults.textModel),
  };
}

function rowToSettings(row) {
  return {
    analysisMode: row.analysis_mode || (row.pipeline_mode === "single" ? "single_multimodal" : "legacy_dual_model"),
    multimodalProvider: row.multimodal_provider || row.single_provider || "qwen",
    multimodalModel: row.multimodal_model || row.single_model || "qwen3.8-max",
    allowTeacherModelSelection: row.allow_teacher_model_selection === 1,
    knowledgeBaseEnabled: row.knowledge_base_enabled !== 0,
    pipelineMode: row.pipeline_mode,
    singleProvider: row.single_provider,
    singleModel: row.single_model,
    visionProvider: row.vision_provider,
    visionModel: row.vision_model,
    textProvider: row.text_provider,
    textModel: row.text_model,
    updatedAt: row.updated_at || "",
    updatedBy: row.updated_by || "",
    updatedByDisplayName: row.updated_by_display_name || "",
    source: "sqlite",
  };
}

function readLegacySettings() {
  try {
    const raw = fs.readFileSync(legacySettingsFilePath, "utf8");
    return sanitizeSettings(JSON.parse(raw));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    console.warn("legacy_model_settings_import_skipped");
    return null;
  }
}

function defaultSettings() {
  return sanitizeSettings({});
}

function getSettingsRow(organizationId) {
  return getDatabase().prepare(`
    SELECT s.*, u.display_name AS updated_by_display_name
    FROM system_model_settings s
    LEFT JOIN users u ON u.id = s.updated_by
    WHERE s.organization_id = ?
    LIMIT 1
  `).get(organizationId);
}

function upsertSettings({ organizationId, settings, updatedBy = null }) {
  const safeSettings = sanitizeSettings(settings);
  const db = getDatabase();
  const now = new Date().toISOString();
  const existing = db.prepare("SELECT id, created_at FROM system_model_settings WHERE organization_id = ?").get(organizationId);
  const id = existing?.id || crypto.randomUUID();
  db.prepare(`
    INSERT INTO system_model_settings (
      id, organization_id, pipeline_mode, single_provider, single_model, vision_provider,
      vision_model, text_provider, text_model, analysis_mode, multimodal_provider,
      multimodal_model, allow_teacher_model_selection, knowledge_base_enabled, updated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(organization_id) DO UPDATE SET
      pipeline_mode = excluded.pipeline_mode,
      single_provider = excluded.single_provider,
      single_model = excluded.single_model,
      vision_provider = excluded.vision_provider,
      vision_model = excluded.vision_model,
      text_provider = excluded.text_provider,
      text_model = excluded.text_model,
      analysis_mode = excluded.analysis_mode,
      multimodal_provider = excluded.multimodal_provider,
      multimodal_model = excluded.multimodal_model,
      allow_teacher_model_selection = excluded.allow_teacher_model_selection,
      knowledge_base_enabled = excluded.knowledge_base_enabled,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at
  `).run(
    id,
    organizationId,
    safeSettings.pipelineMode,
    safeSettings.singleProvider,
    safeSettings.singleModel,
    safeSettings.visionProvider,
    safeSettings.visionModel,
    safeSettings.textProvider,
    safeSettings.textModel,
    safeSettings.analysisMode,
    safeSettings.multimodalProvider,
    safeSettings.multimodalModel,
    safeSettings.allowTeacherModelSelection ? 1 : 0,
    safeSettings.knowledgeBaseEnabled ? 1 : 0,
    updatedBy,
    existing?.created_at || now,
    now,
  );
  return rowToSettings(getSettingsRow(organizationId));
}

function ensureModelSettingsForOrganization(organizationId) {
  const row = getSettingsRow(organizationId);
  if (row) return rowToSettings(row);
  const legacy = readLegacySettings();
  return upsertSettings({
    organizationId,
    settings: legacy || defaultSettings(),
    updatedBy: null,
  });
}

function getAdminModelSettings(token) {
  const admin = requireAdmin(token);
  return ensureModelSettingsForOrganization(admin.organizationId);
}

function saveAdminModelSettings({ token, settings }) {
  const admin = requireAdmin(token);
  return upsertSettings({ organizationId: admin.organizationId, settings, updatedBy: admin.id });
}

function getOrganizationModelSettings(organizationId) {
  return ensureModelSettingsForOrganization(organizationId);
}

function providerStatus(token) {
  const admin = requireAdmin(token);
  const settings = getOrganizationModelSettings(admin.organizationId);
  const safeBaseUrl = (configuredValue, fallbackValue = "") => {
    const value = configuredValue || fallbackValue;
    try {
      const url = new URL(String(value || ""));
      return { host: url.host, source: configuredValue ? "app.env" : "default" };
    } catch {
      return { host: "未配置", source: configuredValue ? "app.env" : "default" };
    }
  };
  return {
    qwen: { configured: Boolean(process.env.QWEN_API_KEY), supportsVision: true, ...safeBaseUrl(process.env.QWEN_BASE_URL) },
    deepseek: { configured: Boolean(process.env.DEEPSEEK_API_KEY), supportsVision: true, ...safeBaseUrl(process.env.DEEPSEEK_BASE_URL, "https://api.deepseek.com") },
    openai: { configured: Boolean(process.env.OPENAI_API_KEY), supportsVision: true, ...safeBaseUrl(process.env.OPENAI_BASE_URL, "https://api.openai.com/v1") },
    doubao: { configured: Boolean(process.env.DOUBAO_API_KEY), supportsVision: false, ...safeBaseUrl(process.env.DOUBAO_BASE_URL) },
    selected: {
      analysisMode: settings.analysisMode,
      provider: settings.multimodalProvider,
      model: settings.multimodalModel,
      reportProvider: settings.textProvider,
      reportModel: settings.textModel,
      updatedAt: settings.updatedAt,
    },
  };
}

module.exports = {
  getAdminModelSettings,
  saveAdminModelSettings,
  getOrganizationModelSettings,
  providerStatus,
  sanitizeSettings,
};
