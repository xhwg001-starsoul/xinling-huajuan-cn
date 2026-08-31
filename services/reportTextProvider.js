const { normalizeContentType } = require("../model-adapters");
const { providerDefinition } = require("./modelRuntimeConfigService");
const { analysisTimeoutMs, extractChatResult, extractOpenAIResult, postJson } = require("./providers/multimodal/common");
const { buildChatCompletionsReportBody, reportReasoningMode } = require("./reportProviderConfig");

const REPORT_MAX_TOKENS = {
  "心灵对话": 7000,
  "教师专业观察报告": 12000,
  "后续访谈问题": 3000,
  "家校沟通建议": 4000,
  "辅导记录初稿": 5000,
  "风险提示与转介建议": 3500,
};

function reportProviderTimeoutMs() {
  return analysisTimeoutMs(process.env.REPORT_PROVIDER_TIMEOUT_MS || 360000);
}

function reportMaxTokens(outputType) {
  return REPORT_MAX_TOKENS[normalizeContentType({ contentType: outputType })] || 5000;
}

function assertPureText(prompt) {
  if (/data:image\//i.test(String(prompt || "")) || /;base64,/i.test(String(prompt || ""))) {
    throw new Error("report_provider_received_image_input");
  }
}

async function generateTextReport({ stage, prompt, outputType, requestId, fetchImpl = fetch }) {
  assertPureText(prompt);
  const definition = providerDefinition(stage.provider);
  if (!["openai", "deepseek", "qwen"].includes(stage.provider) || !definition.implemented) {
    throw new Error("report_provider_not_implemented");
  }
  const apiKey = process.env[definition.apiKeyEnv];
  if (!apiKey) throw new Error(`${stage.provider}_api_key_missing`);
  const maxTokens = reportMaxTokens(outputType);
  const timeoutMs = reportProviderTimeoutMs();
  const providerStartedAt = Date.now();
  const body = stage.provider === "openai"
    ? {
      model: stage.model,
      store: false,
      max_output_tokens: maxTokens,
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
    }
    : buildChatCompletionsReportBody({ stage, prompt, maxTokens, temperature: 0.7 });
  let data;
  try {
    data = await postJson({ provider: stage.provider, stage, apiKey, body, fetchImpl, timeoutMs });
  } catch (error) {
    error.performanceDiagnostics = {
      ...(error.performanceDiagnostics || {}),
      reportProviderLatencyMs: Date.now() - providerStartedAt,
      reportMaxTokens: maxTokens,
      reportProviderTimeoutMs: timeoutMs,
      responseBodyComplete: false,
    };
    throw error;
  }
  const raw = stage.provider === "openai" ? extractOpenAIResult(data) : extractChatResult(data);
  const markdown = String(raw.text || "").trim();
  if (!markdown) throw new Error("report_generation_empty");
  return {
    markdown,
    provider: stage.provider,
    model: stage.model,
    requestId,
    usage: raw.usage || {},
    finishReason: raw.finishReason || "",
    truncated: Boolean(raw.truncated),
    performance: {
      ...(raw.performance || {}),
      maxTokens,
      backendProviderTimeoutMs: timeoutMs,
      reportChars: markdown.length,
      reportReasoningMode: reportReasoningMode(stage),
    },
  };
}

module.exports = { REPORT_MAX_TOKENS, assertPureText, generateTextReport, reportMaxTokens, reportProviderTimeoutMs };
