const { normalizeModelConfig } = require("../config/modelDefaults");
const { getOrganizationModelSettings } = require("./systemModelSettingsService");

const PROVIDERS = {
  openai: {
    name: "OpenAI",
    apiKeyEnv: "OPENAI_API_KEY",
    baseUrlEnv: "OPENAI_BASE_URL",
    defaultBaseUrl: "https://api.openai.com/v1/responses",
    defaultVisionModel: "gpt-4o-mini",
    defaultTextModel: "gpt-4o-mini",
    implemented: true,
    supportsVision: true,
  },
  deepseek: {
    name: "DeepSeek",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    baseUrlEnv: "DEEPSEEK_BASE_URL",
    defaultBaseUrl: "https://api.deepseek.com",
    defaultTextModel: "deepseek-chat",
    implemented: true,
    defaultVisionModel: "deepseek-v4-flash-vision-exp",
    supportsVision: true,
  },
  qwen: {
    name: "Qwen",
    apiKeyEnv: "QWEN_API_KEY",
    baseUrlEnv: "QWEN_BASE_URL",
    defaultBaseUrl: "",
    defaultVisionModel: "qwen3.7-plus",
    defaultTextModel: "qwen-plus",
    implemented: true,
    supportsVision: true,
  },
  doubao: {
    name: "Doubao",
    apiKeyEnv: "DOUBAO_API_KEY",
    baseUrlEnv: "DOUBAO_BASE_URL",
    defaultBaseUrl: "",
    defaultVisionModel: "doubao-vision-placeholder",
    defaultTextModel: "doubao-text-placeholder",
    implemented: false,
  },
};

function providerDefinition(provider) {
  const definition = PROVIDERS[provider];
  if (!definition) {
    const error = new Error("provider_not_implemented");
    error.provider = provider;
    throw error;
  }
  return definition;
}

function appendEndpoint(baseUrl, endpoint) {
  const normalized = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!normalized) return "";
  return normalized.endsWith(endpoint) ? normalized : `${normalized}${endpoint}`;
}

function requestUrlFor(provider, baseUrl) {
  if (provider === "openai") return appendEndpoint(baseUrl, "/responses");
  if (["qwen", "deepseek", "doubao"].includes(provider)) {
    return appendEndpoint(baseUrl, "/chat/completions");
  }
  return String(baseUrl || "").trim();
}

function safeUrlDetails(baseUrl) {
  try {
    const parsed = new URL(baseUrl);
    const host = parsed.host;
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";
    return { baseUrl: parsed.toString().replace(/\/$/, ""), baseUrlHost: host };
  } catch {
    return { baseUrl: "", baseUrlHost: "" };
  }
}

function modelSettingsSource(settings, explicitSource) {
  const source = String(explicitSource || settings?.source || "default").trim().toLowerCase();
  return ["sqlite", "file", "app.env", "request", "default"].includes(source) ? source : "default";
}

function stageRuntime({ provider, model, settingsSource, updatedAt }) {
  const definition = providerDefinition(provider);
  const configuredBaseUrl = String(process.env[definition.baseUrlEnv] || "").trim();
  const rawBaseUrl = configuredBaseUrl || definition.defaultBaseUrl;
  const safeUrl = safeUrlDetails(rawBaseUrl);
  return {
    provider,
    model: String(model || "").trim(),
    baseUrl: rawBaseUrl,
    requestUrl: requestUrlFor(provider, rawBaseUrl),
    baseUrlHost: safeUrl.baseUrlHost,
    safeBaseUrl: safeUrl.baseUrl,
    settingsSource,
    baseUrlSource: configuredBaseUrl ? "app.env" : "default",
    updatedAt: String(updatedAt || ""),
    apiKeyConfigured: Boolean(process.env[definition.apiKeyEnv]),
  };
}

function resolveModelRuntimeConfig(settings = {}, { source } = {}) {
  const modelConfig = normalizeModelConfig(settings);
  const settingsSource = modelSettingsSource(settings, source);
  const updatedAt = String(settings.updatedAt || "");
  const single = stageRuntime({
    provider: modelConfig.singleProvider,
    model: modelConfig.singleModel,
    settingsSource,
    updatedAt,
  });
  const multimodal = stageRuntime({
    provider: modelConfig.multimodalProvider,
    model: modelConfig.multimodalModel,
    settingsSource,
    updatedAt,
  });
  const vision = modelConfig.pipelineMode === "single"
    ? { ...single }
    : stageRuntime({
      provider: modelConfig.visionProvider,
      model: modelConfig.visionModel,
      settingsSource,
      updatedAt,
    });
  const text = modelConfig.pipelineMode === "single"
    ? { ...single }
    : stageRuntime({
      provider: modelConfig.textProvider,
      model: modelConfig.textModel,
      settingsSource,
      updatedAt,
    });
  const report = stageRuntime({
    provider: modelConfig.textProvider,
    model: modelConfig.textModel,
    settingsSource,
    updatedAt,
  });
  return {
    analysisMode: modelConfig.analysisMode,
    pipelineMode: modelConfig.pipelineMode,
    modelConfig,
    settingsSource,
    updatedAt,
    single,
    multimodal,
    vision,
    text,
    report,
  };
}

function resolveOrganizationModelRuntimeConfig(organizationId) {
  const settings = getOrganizationModelSettings(organizationId);
  return resolveModelRuntimeConfig(settings, { source: settings.source || "sqlite" });
}

function safeStageDiagnostic(stage) {
  return {
    provider: stage.provider,
    model: stage.model,
    baseUrl: stage.safeBaseUrl,
    baseUrlHost: stage.baseUrlHost,
    settingsSource: stage.settingsSource,
    baseUrlSource: stage.baseUrlSource,
    updatedAt: stage.updatedAt,
  };
}

function safeRuntimeDiagnostic(runtimeConfig) {
  return {
    analysisMode: runtimeConfig.analysisMode,
    pipelineMode: runtimeConfig.pipelineMode,
    multimodal: safeStageDiagnostic(runtimeConfig.multimodal),
    vision: safeStageDiagnostic(runtimeConfig.vision),
    text: safeStageDiagnostic(runtimeConfig.text),
    report: safeStageDiagnostic(runtimeConfig.report),
  };
}

module.exports = {
  PROVIDERS,
  providerDefinition,
  requestUrlFor,
  resolveModelRuntimeConfig,
  resolveOrganizationModelRuntimeConfig,
  safeStageDiagnostic,
  safeRuntimeDiagnostic,
};
