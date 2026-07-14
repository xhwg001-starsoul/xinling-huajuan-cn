const { requireAdmin } = require("./authService");
const {
  providerDefinition,
  resolveOrganizationModelRuntimeConfig,
  safeStageDiagnostic,
} = require("./modelRuntimeConfigService");
const { testQwenVisionConnection } = require("./providers/qwenVisionProvider");

const MODEL_CONNECTION_TEST_TIMEOUT_MS = 30000;

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
  const parts = message.split(":");
  if (parts[0] === "qwen_request_failed") {
    const safeParts = parts.slice(0, 3).map((part) => part.replace(/[^a-z0-9_.-]/gi, "").slice(0, 80));
    return safeParts.filter(Boolean).join(":") || "qwen_request_failed";
  }
  return /^[a-z0-9_:.-]+$/i.test(message) ? message.slice(0, 160) : "model_test_failed";
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

async function callTextProvider(stage) {
  const definition = assertStageReady(stage);
  if (!["openai", "deepseek", "qwen"].includes(stage.provider)) {
    throw testError("provider_not_implemented", stage);
  }

  const apiKey = process.env[definition.apiKeyEnv];
  const body = stage.provider === "openai"
    ? {
      model: stage.model,
      max_output_tokens: 8,
      input: [{ role: "user", content: [{ type: "input_text", text: "Reply only with: connection_ok" }] }],
    }
    : {
      model: stage.model,
      messages: [{ role: "user", content: "Reply only with: connection_ok" }],
      max_tokens: 8,
      temperature: 0,
      stream: false,
    };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_CONNECTION_TEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(stage.requestUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw testError(`${stage.provider}_request_timeout`, stage);
    }
    throw testError(`${stage.provider}_request_failed`, stage);
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    let errorCode = `${stage.provider}_request_failed`;
    try {
      const data = await response.json();
      const providerCode = String(data?.error?.code || data?.code || "").slice(0, 80);
      if (providerCode) errorCode = `${errorCode}:${response.status}:${providerCode}`;
      else errorCode = `${errorCode}:${response.status}`;
    } catch {
      errorCode = `${errorCode}:${response.status}`;
    }
    throw testError(errorCode, stage, 400, response.status);
  }
}

function safeResult({ success, stage, startedAt, error }) {
  return {
    success,
    ...safeStageDiagnostic(stage),
    configurationSource: {
      settings: stage.settingsSource,
      baseUrl: stage.baseUrlSource,
    },
    durationMs: Date.now() - startedAt,
    ...(error ? { error: safeErrorCode(error), httpStatus: error.httpStatus || undefined } : {}),
  };
}

async function testVisionRuntime(runtime) {
  const stage = runtime.vision;
  const startedAt = Date.now();
  try {
    if (runtime.pipelineMode === "single" && stage.provider !== "openai") {
      throw testError("provider_not_implemented", stage);
    }
    if (runtime.pipelineMode === "split" && !["openai", "qwen"].includes(stage.provider)) {
      throw testError("provider_not_implemented", stage);
    }
    const definition = assertStageReady(stage);
    if (definition.supportsVision === false || stage.provider === "deepseek") {
      throw testError("provider_not_implemented", stage);
    }
    if (stage.provider === "qwen") {
      await testQwenVisionConnection({ runtimeStage: stage });
    } else if (stage.provider !== "openai") {
      throw testError("provider_not_implemented", stage);
    }
    return safeResult({ success: true, stage, startedAt });
  } catch (error) {
    return safeResult({ success: false, stage, startedAt, error });
  }
}

async function testTextRuntime(runtime) {
  const stage = runtime.text;
  const startedAt = Date.now();
  try {
    if (runtime.pipelineMode === "single" && stage.provider !== "openai") {
      throw testError("provider_not_implemented", stage);
    }
    if (runtime.pipelineMode === "split" && !["openai", "deepseek"].includes(stage.provider)) {
      throw testError("provider_not_implemented", stage);
    }
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
  const [vision, text] = await Promise.all([
    testVisionRuntime(runtime),
    testTextRuntime(runtime),
  ]);
  const success = Boolean(vision.success && text.success);
  return {
    success,
    pipelineMode: runtime.pipelineMode,
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

module.exports = {
  testVisionModel,
  testTextModel,
  testModelPipeline,
};
