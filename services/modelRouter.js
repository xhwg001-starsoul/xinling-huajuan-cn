const { normalizeModelConfig } = require("../config/modelDefaults");
const openaiProvider = require("./providers/openaiProvider");

function createRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function traceValue(value, fallback = "-") {
  const normalized = String(value || fallback)
    .replace(/[^a-zA-Z0-9._:-]/g, "_")
    .slice(0, 120);
  return normalized || fallback;
}

function traceModels(modelConfig) {
  if (modelConfig.pipelineMode === "single") {
    return {
      visionProvider: modelConfig.singleProvider,
      visionModel: modelConfig.singleModel,
      textProvider: modelConfig.singleProvider,
      textModel: modelConfig.singleModel,
    };
  }
  return {
    visionProvider: modelConfig.visionProvider,
    visionModel: modelConfig.visionModel,
    textProvider: modelConfig.textProvider,
    textModel: modelConfig.textModel,
  };
}

function writeModelTrace({ requestId, modelConfig, visionStatus, textStatus, error }) {
  const models = traceModels(modelConfig);
  const parts = [
    `[model-trace] requestId=${traceValue(requestId)}`,
    `pipeline=${traceValue(modelConfig.pipelineMode)}`,
    `visionProvider=${traceValue(models.visionProvider)}`,
    `visionModel=${traceValue(models.visionModel)}`,
    `textProvider=${traceValue(models.textProvider)}`,
    `textModel=${traceValue(models.textModel)}`,
    `visionStatus=${traceValue(visionStatus)}`,
    `textStatus=${traceValue(textStatus)}`,
  ];
  if (error?.httpStatus) parts.push(`httpStatus=${traceValue(error.httpStatus)}`);
  if (error) parts.push(`errorCode=${traceValue(String(error.message || "model_call_failed").split(":")[0])}`);
  console.info(parts.join(" "));
}

function firstImageFrom(images) {
  if (Array.isArray(images)) return images[0];
  return images;
}

function providerNotImplemented(provider, message) {
  const error = new Error("provider_not_implemented");
  error.provider = provider;
  if (message) error.detail = message;
  throw error;
}

function assertSupportedRouting(modelConfig) {
  if (modelConfig.pipelineMode === "single") {
    if (modelConfig.singleProvider !== "openai") {
      providerNotImplemented(
        modelConfig.singleProvider,
        "单模型模式需要同一个模型同时完成读图和报告生成，当前仅支持 OpenAI。"
      );
    }
    return;
  }

  if (!["openai", "qwen"].includes(modelConfig.visionProvider)) {
    providerNotImplemented(
      modelConfig.visionProvider,
      "当前读图阶段仍只使用 OpenAI 视觉模型。"
    );
  }

  if (!["openai", "deepseek"].includes(modelConfig.textProvider)) {
    providerNotImplemented(modelConfig.textProvider);
  }
}

async function generateAnalysisWithModelRouter({
  images,
  userInputs = {},
  prompt,
  contentType,
  modelConfig,
}) {
  const requestId = createRequestId();
  const resolvedConfig = normalizeModelConfig(modelConfig);
  try {
    assertSupportedRouting(resolvedConfig);

    const profile = {
      ...userInputs,
      ...(contentType ? { contentType } : {}),
    };

    // single/openai 保持原功能；split 严格使用管理员指定的视觉和文本 provider。
    // 任一阶段失败都会直接终止，不会静默切换到 OpenAI。
    void prompt;
    const result = await openaiProvider.generateAnalysis({
      image: firstImageFrom(images),
      profile,
      modelConfig: resolvedConfig,
    });
    writeModelTrace({
      requestId,
      modelConfig: resolvedConfig,
      visionStatus: "success",
      textStatus: "success",
    });
    return result;
  } catch (error) {
    const failedStage = error?.modelStage;
    writeModelTrace({
      requestId,
      modelConfig: resolvedConfig,
      visionStatus: failedStage === "vision" ? "failed" : failedStage === "text" ? "success" : "not_started",
      textStatus: failedStage === "text" ? "failed" : "not_started",
      error,
    });
    throw error;
  }
}

module.exports = {
  generateAnalysisWithModelRouter,
};
