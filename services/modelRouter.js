const { normalizeModelConfig } = require("../config/modelDefaults");
const openaiProvider = require("./providers/openaiProvider");

function firstImageFrom(images) {
  if (Array.isArray(images)) return images[0];
  return images;
}

function assertOpenAIOnly(modelConfig) {
  const providers =
    modelConfig.pipelineMode === "split"
      ? [modelConfig.visionProvider, modelConfig.textProvider]
      : [modelConfig.singleProvider];

  const unsupportedProvider = providers.find((provider) => provider !== "openai");
  if (unsupportedProvider) {
    const error = new Error("provider_not_implemented");
    error.provider = unsupportedProvider;
    throw error;
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
  assertOpenAIOnly(resolvedConfig);

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
