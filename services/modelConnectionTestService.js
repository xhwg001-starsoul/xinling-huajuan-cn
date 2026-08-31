const { requireAdmin } = require("./authService");
const {
  providerDefinition,
  resolveOrganizationModelRuntimeConfig,
  safeStageDiagnostic,
} = require("./modelRuntimeConfigService");
const {
  CONNECTION_TEST_IMAGE,
  extractChatResult,
  extractOpenAIResult,
  postJson,
} = require("./providers/multimodal/common");
const { parseJsonObject } = require("./htpVisualAnalysis");
const { buildChatCompletionsReportBody } = require("./reportProviderConfig");

const MODEL_CONNECTION_TEST_TIMEOUT_MS = 30000;
const VISION_TEST_PROMPT = '识别这张非学生测试图片中的基本物体，只输出 JSON：{"objects":["名称"]}';

function testError(code, stage, statusCode = 400, httpStatus) {
  const error = new Error(code);
  error.statusCode = statusCode;
  error.httpStatus = httpStatus;
  error.provider = stage?.provider || "";
  error.model = stage?.model || "";
  error.baseUrlHost = stage?.baseUrlHost || "";
  error.configSource = stage ? `${stage.settingsSource}/${stage.baseUrlSource}` : "";
  return error;
}

function safeErrorCode(error) {
  const message = String(error?.message || "model_test_failed");
  return /^[a-z0-9_:.-]+$/i.test(message) ? message.slice(0, 180) : "model_test_failed";
}

function requireModelRuntime(token) {
  const admin = requireAdmin(token);
  return resolveOrganizationModelRuntimeConfig(admin.organizationId);
}

function assertStageReady(stage) {
  const definition = providerDefinition(stage.provider);
  if (!definition.implemented) throw testError("provider_not_implemented", stage);
  if (!process.env[definition.apiKeyEnv]) throw testError(`${stage.provider}_api_key_missing`, stage);
  if (!stage.baseUrl || !stage.requestUrl) throw testError(`${stage.provider}_base_url_missing`, stage);
  if (!stage.model) throw testError(`${stage.provider}_model_missing`, stage);
  return definition;
}

async function callTextProvider(stage, { fetchImpl = fetch } = {}) {
  const definition = assertStageReady(stage);
  if (!["openai", "deepseek", "qwen"].includes(stage.provider)) throw testError("provider_not_implemented", stage);
  const apiKey = process.env[definition.apiKeyEnv];
  const body = stage.provider === "openai"
    ? { model: stage.model, max_output_tokens: 8, input: [{ role: "user", content: [{ type: "input_text", text: "Reply only with: connection_ok" }] }] }
    : buildChatCompletionsReportBody({ stage, prompt: "Reply only with: connection_ok", maxTokens: 8, temperature: 0 });
  await postJson({ provider: stage.provider, stage, apiKey, body, fetchImpl, timeoutMs: MODEL_CONNECTION_TEST_TIMEOUT_MS });
}

async function callVisionProvider(stage) {
  const definition = assertStageReady(stage);
  if (!["openai", "qwen", "deepseek"].includes(stage.provider)) throw testError("provider_not_implemented", stage);
  const apiKey = process.env[definition.apiKeyEnv];
  const body = stage.provider === "openai"
    ? {
      model: stage.model,
      max_output_tokens: 80,
      input: [{ role: "user", content: [{ type: "input_text", text: VISION_TEST_PROMPT }, { type: "input_image", image_url: CONNECTION_TEST_IMAGE, detail: "high" }] }],
    }
    : {
      model: stage.model,
      messages: [{ role: "user", content: [{ type: "text", text: VISION_TEST_PROMPT }, { type: "image_url", image_url: { url: CONNECTION_TEST_IMAGE, ...(stage.provider === "deepseek" ? { detail: "high" } : {}) } }] }],
      response_format: { type: "json_object" },
      max_tokens: 80,
      temperature: 0,
      stream: false,
      ...(stage.provider === "deepseek" ? { thinking: { type: "disabled" } } : {}),
    };
  let data;
  try {
    data = await postJson({ provider: stage.provider, stage, apiKey, body, timeoutMs: MODEL_CONNECTION_TEST_TIMEOUT_MS });
  } catch (error) {
    if (stage.provider === "openai" && error.httpStatus === 400) {
      throw testError("configured_openai_model_not_multimodal", stage, 400, 400);
    }
    throw error;
  }
  const raw = stage.provider === "openai" ? extractOpenAIResult(data) : extractChatResult(data);
  const parsed = parseJsonObject(raw.text, `${stage.provider}_vision_test_json_invalid`);
  if (!Array.isArray(parsed.objects)) throw testError(`${stage.provider}_vision_test_json_invalid`, stage);
  return { supportsVision: true, supportsJson: true };
}

function safeResult({ success, stage, startedAt, capabilities, error }) {
  return {
    success,
    ...safeStageDiagnostic(stage),
    configurationSource: { settings: stage.settingsSource, baseUrl: stage.baseUrlSource },
    durationMs: Date.now() - startedAt,
    supportsVision: Boolean(capabilities?.supportsVision),
    supportsJson: Boolean(capabilities?.supportsJson),
    ...(error ? { error: safeErrorCode(error), httpStatus: error.httpStatus || undefined } : {}),
  };
}

async function testVisionRuntime(runtime) {
  const stage = runtime.analysisMode === "single_multimodal" ? runtime.multimodal : runtime.vision;
  const startedAt = Date.now();
  try {
    const capabilities = await callVisionProvider(stage);
    return safeResult({ success: true, stage, startedAt, capabilities });
  } catch (error) {
    return safeResult({ success: false, stage, startedAt, error });
  }
}

async function testTextRuntime(runtime) {
  const stage = runtime.analysisMode === "single_multimodal" ? runtime.report : runtime.text;
  const startedAt = Date.now();
  try {
    await callTextProvider(stage);
    return safeResult({ success: true, stage, startedAt });
  } catch (error) {
    return safeResult({ success: false, stage, startedAt, error });
  }
}

async function testVisionModel(token) {
  return testVisionRuntime(requireModelRuntime(token));
}

async function testTextModel(token) {
  return testTextRuntime(requireModelRuntime(token));
}

async function testModelPipeline(token) {
  const startedAt = Date.now();
  const runtime = requireModelRuntime(token);
  if (runtime.analysisMode === "single_multimodal") {
    const vision = await testVisionRuntime(runtime);
    const text = await testTextRuntime(runtime);
    const success = Boolean(vision.success && text.success);
    return {
      success,
      analysisMode: runtime.analysisMode,
      configurationSource: runtime.settingsSource,
      updatedAt: runtime.updatedAt,
      visionStatus: vision.success ? "success" : "failed",
      textStatus: text.success ? "success" : "failed",
      overallStatus: success ? "success" : "failed",
      durationMs: Date.now() - startedAt,
      vision,
      text,
    };
  }
  const vision = await testVisionRuntime(runtime);
  const text = await testTextRuntime(runtime);
  const success = Boolean(vision.success && text.success);
  return {
    success,
    analysisMode: runtime.analysisMode,
    configurationSource: runtime.settingsSource,
    updatedAt: runtime.updatedAt,
    visionStatus: vision.success ? "success" : "failed",
    textStatus: text.success ? "success" : "failed",
    overallStatus: success ? "success" : "failed",
    durationMs: Date.now() - startedAt,
    vision,
    text,
  };
}

module.exports = { callTextProvider, testVisionModel, testTextModel, testModelPipeline };
