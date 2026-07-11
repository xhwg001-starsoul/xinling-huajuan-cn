const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";

function valueFromEnv(name, fallback) {
  return process.env[name] || fallback;
}

function getDefaultModelConfig() {
  return {
    pipelineMode: valueFromEnv("MODEL_PIPELINE", "split"),
    singleProvider: valueFromEnv("SINGLE_PROVIDER", "openai"),
    singleModel: valueFromEnv("SINGLE_MODEL", process.env.OPENAI_MODEL || OPENAI_DEFAULT_MODEL),

    visionProvider: valueFromEnv("VISION_PROVIDER", "qwen"),
    visionModel: valueFromEnv("VISION_MODEL", process.env.QWEN_VISION_MODEL || "qwen3.7-plus"),

    textProvider: valueFromEnv("TEXT_PROVIDER", "deepseek"),
    textModel: valueFromEnv("TEXT_MODEL", process.env.DEEPSEEK_TEXT_MODEL || "deepseek-chat"),
  };
}

function normalizeProvider(value, fallback) {
  return String(value || fallback || "openai").trim().toLowerCase();
}

function normalizeModelConfig(modelConfig = {}) {
  const defaults = getDefaultModelConfig();
  const merged = {
    ...defaults,
    ...(modelConfig && typeof modelConfig === "object" ? modelConfig : {}),
  };

  return {
    pipelineMode: ["single", "split"].includes(merged.pipelineMode) ? merged.pipelineMode : defaults.pipelineMode,
    singleProvider: normalizeProvider(merged.singleProvider, defaults.singleProvider),
    singleModel: String(merged.singleModel || defaults.singleModel),
    visionProvider: normalizeProvider(merged.visionProvider, defaults.visionProvider),
    visionModel: String(merged.visionModel || defaults.visionModel),
    textProvider: normalizeProvider(merged.textProvider, defaults.textProvider),
    textModel: String(merged.textModel || defaults.textModel),
  };
}

module.exports = {
  OPENAI_DEFAULT_MODEL,
  getDefaultModelConfig,
  normalizeModelConfig,
};
