const { requireAdmin } = require("./authService");
const { getOrganizationModelSettings } = require("./systemModelSettingsService");

function testError(code, statusCode = 400) {
  const error = new Error(code);
  error.statusCode = statusCode;
  return error;
}

function chatUrl(baseUrl) {
  const normalized = String(baseUrl || "").trim().replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions") ? normalized : `${normalized}/chat/completions`;
}

function responsesUrl(baseUrl) {
  const normalized = String(baseUrl || "https://api.openai.com/v1/responses").trim().replace(/\/+$/, "");
  return normalized.endsWith("/responses") ? normalized : `${normalized}/responses`;
}

function providerEnv(provider) {
  if (provider === "openai") return { key: "OPENAI_API_KEY", base: "OPENAI_BASE_URL" };
  if (provider === "qwen") return { key: "QWEN_API_KEY", base: "QWEN_BASE_URL" };
  if (provider === "deepseek") return { key: "DEEPSEEK_API_KEY", base: "DEEPSEEK_BASE_URL" };
  if (provider === "doubao") return { key: "DOUBAO_API_KEY", base: "DOUBAO_BASE_URL" };
  throw testError("provider_not_implemented");
}

function defaultBaseUrl(provider) {
  if (provider === "openai") return "https://api.openai.com/v1/responses";
  if (provider === "deepseek") return "https://api.deepseek.com";
  return "";
}

function configured(provider) {
  const env = providerEnv(provider);
  return Boolean(process.env[env.key]);
}

function safeErrorCode(error) {
  const message = String(error?.message || "model_test_failed");
  return /^[a-z0-9_:.-]+$/i.test(message) ? message.slice(0, 160) : "model_test_failed";
}

async function callTextProvider({ provider, model }) {
  const env = providerEnv(provider);
  const apiKey = process.env[env.key];
  if (!apiKey) throw testError(`${provider}_api_key_missing`, 400);

  if (provider === "openai") {
    const response = await fetch(responsesUrl(process.env[env.base]), {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        max_output_tokens: 8,
        input: [{ role: "user", content: [{ type: "input_text", text: "请只回复：连接成功" }] }],
      }),
    });
    if (!response.ok) {
      const error = testError(`openai_http_${response.status}`, 400);
      error.httpStatus = response.status;
      throw error;
    }
    return;
  }

  if (provider === "deepseek" || provider === "qwen") {
    const baseUrl = process.env[env.base] || (provider === "deepseek" ? "https://api.deepseek.com" : "");
    if (!baseUrl) throw testError(`${provider}_base_url_missing`, 400);
    const response = await fetch(chatUrl(baseUrl), {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "请只回复：连接成功" }],
        max_tokens: 8,
        temperature: 0,
        stream: false,
      }),
    });
    if (!response.ok) {
      const error = testError(`${provider}_http_${response.status}`, 400);
      error.httpStatus = response.status;
      throw error;
    }
    return;
  }

  throw testError("provider_not_implemented", 400);
}

function safeResult({ success, provider, model, startedAt, error }) {
  return {
    success,
    provider,
    model,
    durationMs: Date.now() - startedAt,
    ...(error ? { error: safeErrorCode(error), httpStatus: error.httpStatus || undefined } : {}),
  };
}

function selectedText(settings) {
  return settings.pipelineMode === "single"
    ? { provider: settings.singleProvider, model: settings.singleModel }
    : { provider: settings.textProvider, model: settings.textModel };
}

function selectedVision(settings) {
  return settings.pipelineMode === "single"
    ? { provider: settings.singleProvider, model: settings.singleModel }
    : { provider: settings.visionProvider, model: settings.visionModel };
}

function requireModelSettings(token) {
  const admin = requireAdmin(token);
  return getOrganizationModelSettings(admin.organizationId);
}

async function testVisionModel(token) {
  const settings = requireModelSettings(token);
  const { provider, model } = selectedVision(settings);
  const startedAt = Date.now();
  try {
    if (!configured(provider)) throw testError(`${provider}_api_key_missing`, 400);
    const env = providerEnv(provider);
    const baseUrl = process.env[env.base] || defaultBaseUrl(provider);
    if (!baseUrl) throw testError(`${provider}_base_url_missing`, 400);
    if (!String(model || "").trim()) throw testError(`${provider}_model_missing`, 400);
    if (provider === "deepseek") throw testError("provider_not_implemented", 400);
    if (provider === "doubao") throw testError("provider_not_implemented", 400);
    return safeResult({ success: true, provider, model, startedAt });
  } catch (error) {
    return safeResult({ success: false, provider, model, startedAt, error });
  }
}

async function testTextModel(token) {
  const settings = requireModelSettings(token);
  const { provider, model } = selectedText(settings);
  const startedAt = Date.now();
  try {
    await callTextProvider({ provider, model });
    return safeResult({ success: true, provider, model, startedAt });
  } catch (error) {
    return safeResult({ success: false, provider, model, startedAt, error });
  }
}

async function testModelPipeline(token) {
  const startedAt = Date.now();
  const vision = await testVisionModel(token);
  const text = await testTextModel(token);
  return {
    success: Boolean(vision.success && text.success),
    visionStatus: vision.success ? "success" : "failed",
    textStatus: text.success ? "success" : "failed",
    overallStatus: vision.success && text.success ? "success" : "failed",
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
