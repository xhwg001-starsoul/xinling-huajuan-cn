const { normalizeModelConfig } = require("../config/modelDefaults");
const openaiProvider = require("./providers/openaiProvider");

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

  if (modelConfig.visionProvider !== "openai") {
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
  const resolvedConfig = normalizeModelConfig(modelConfig);
  assertSupportedRouting(resolvedConfig);

  const profile = {
    ...userInputs,
    ...(contentType ? { contentType } : {}),
  };

  // 当前默认 single/openai 入口保持原有 OpenAI 报告生成功能不变。
  // 后续 split 模式用于“视觉模型读图 + 文本模型生成报告”。
  // 视觉模型阶段只做客观图像观察，不直接做心理诊断。
  // 文本模型阶段结合图像观察、背景资料和报告类型生成最终报告。
  //
  // 本轮只建立路由结构，不接入 DeepSeek、Qwen、Doubao 等真实调用。
  // prompt 参数为后续扩展预留，当前 OpenAI provider 继续复用既有完整 Prompt。
  void prompt;
  return openaiProvider.generateAnalysis({
    image: firstImageFrom(images),
    profile,
    modelConfig: resolvedConfig,
  });
}

module.exports = {
  generateAnalysisWithModelRouter,
};
