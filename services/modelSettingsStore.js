const fs = require("node:fs/promises");
const path = require("node:path");
const { normalizeModelConfig } = require("../config/modelDefaults");
const { getRuntimeMode } = require("../config/runtimeMode");

const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const settingsFilePath = path.join(dataDir, "model-settings.local.json");
const providerOptions = new Set(["openai", "deepseek", "qwen", "doubao"]);
const pipelineModes = new Set(["single", "split"]);

function safeProvider(value, fallback) {
  const provider = String(value || fallback || "openai").trim().toLowerCase();
  return providerOptions.has(provider) ? provider : fallback || "openai";
}

function safeModelName(value, fallback) {
  return String(value || fallback || "gpt-4o-mini").trim().slice(0, 120) || fallback || "gpt-4o-mini";
}

function sanitizeModelSettings(input = {}) {
  const normalized = normalizeModelConfig(input);
  const pipelineMode = pipelineModes.has(input.pipelineMode) ? input.pipelineMode : normalized.pipelineMode;
  return {
    pipelineMode,
    singleProvider: safeProvider(input.singleProvider, normalized.singleProvider),
    singleModel: safeModelName(input.singleModel, normalized.singleModel),
    visionProvider: safeProvider(input.visionProvider, normalized.visionProvider),
    visionModel: safeModelName(input.visionModel, normalized.visionModel),
    textProvider: safeProvider(input.textProvider, normalized.textProvider),
    textModel: safeModelName(input.textModel, normalized.textModel),
  };
}

async function readJsonFile(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content);
}

async function getModelSettings() {
  const defaults = sanitizeModelSettings({});
  const runtime = getRuntimeMode();
  if (runtime.settingsProvider !== "file") {
    return {
      ...defaults,
      updatedAt: "",
      updatedBy: "env-defaults",
      source: "env",
    };
  }

  try {
    const saved = await readJsonFile(settingsFilePath);
    return {
      ...sanitizeModelSettings(saved),
      updatedAt: typeof saved.updatedAt === "string" ? saved.updatedAt : "",
      updatedBy: typeof saved.updatedBy === "string" ? saved.updatedBy : "cn-dev-admin",
      source: "file",
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return {
        ...defaults,
        updatedAt: "",
        updatedBy: "env-defaults",
        source: "default",
      };
    }
    if (error instanceof SyntaxError) {
      const parseError = new Error("model_settings_file_invalid");
      parseError.statusCode = 500;
      throw parseError;
    }
    throw error;
  }
}

async function saveModelSettings(input = {}) {
  const runtime = getRuntimeMode();
  if (runtime.settingsProvider !== "file") {
    const error = new Error("settings_provider_not_supported");
    error.statusCode = 400;
    throw error;
  }

  const payload = {
    ...sanitizeModelSettings(input),
    updatedAt: new Date().toISOString(),
    updatedBy: "cn-dev-admin",
  };
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(settingsFilePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return {
    ...payload,
    source: "file",
  };
}

module.exports = {
  settingsFilePath,
  getModelSettings,
  saveModelSettings,
  sanitizeModelSettings,
};
