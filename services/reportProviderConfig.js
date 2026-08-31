function stageHost(stage = {}) {
  const configured = String(stage.baseUrlHost || "").trim().toLowerCase();
  if (configured) return configured;
  try {
    return new URL(stage.requestUrl || stage.baseUrl || "").host.toLowerCase();
  } catch {
    return "";
  }
}

function isAlibabaCompatibleStage(stage = {}) {
  const host = stageHost(stage);
  return host === "dashscope.aliyuncs.com"
    || host.endsWith(".dashscope.aliyuncs.com")
    || host.endsWith(".maas.aliyuncs.com");
}

function getReportReasoningConfig(stage = {}) {
  if (stage.provider !== "deepseek") return {};
  if (isAlibabaCompatibleStage(stage)) return { enable_thinking: false };
  return { thinking: { type: "disabled" } };
}

function reportReasoningMode(stage = {}) {
  return stage.provider === "deepseek" ? "disabled" : "provider_default";
}

function buildChatCompletionsReportBody({ stage, prompt, maxTokens, temperature }) {
  return {
    model: stage.model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: maxTokens,
    temperature,
    stream: false,
    ...getReportReasoningConfig(stage),
  };
}

module.exports = {
  buildChatCompletionsReportBody,
  getReportReasoningConfig,
  isAlibabaCompatibleStage,
  reportReasoningMode,
};
