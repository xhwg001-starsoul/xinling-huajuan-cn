const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";

function valueFromEnv(name, fallback) {
  return process.env[name] || fallback;
}

function getDefaultModelConfig() {
  return {
    analysisMode: valueFromEnv("ANALYSIS_MODE", "legacy_dual_model"),
    multimodalProvider: valueFromEnv("MULTIMODAL_PROVIDER", "qwen"),
    multimodalModel: valueFromEnv("MULTIMODAL_MODEL", process.env.QWEN_MULTIMODAL_MODEL || "qwen3.8-max"),
    allowTeacherModelSelection: false,
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

  const multimodalProvider = normalizeProvider(merged.multimodalProvider, defaults.multimodalProvider);
  const multimodalModelFallback = multimodalProvider === "deepseek"
    ? valueFromEnv("DEEPSEEK_VISION_MODEL", "deepseek-v4-flash-vision-exp")
    : multimodalProvider === "openai"
      ? String(merged.singleModel || process.env.OPENAI_MODEL || OPENAI_DEFAULT_MODEL)
      : valueFromEnv("QWEN_MULTIMODAL_MODEL", "qwen3.8-max");
  return {
    analysisMode: ["single_multimodal", "legacy_dual_model"].includes(merged.analysisMode)
      ? merged.analysisMode
      : defaults.analysisMode,
    multimodalProvider,
    multimodalModel: String(merged.multimodalModel || multimodalModelFallback),
    allowTeacherModelSelection: merged.allowTeacherModelSelection === true || merged.allowTeacherModelSelection === 1,
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
