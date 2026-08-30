const { resolveModelRuntimeConfig } = require("../modelRuntimeConfigService");
const {
  normalizeV1Observation,
  parseJsonObject,
  sanitizeV2AnalysisPackage,
} = require("../htpVisualAnalysis");
const {
  HTP_VISUAL_V1,
  HTP_VISUAL_HYPOTHESIS_V2,
} = require("../prompts/htpVisualPrompts");

const QWEN_SYSTEM_PROMPT =
  "你是学校心理健康教育场景中的 HTP 多模态观察引擎。请严格区分客观观察、心理显著性和待验证假设；不得作心理诊断或最终结论。";

const QWEN_CONNECTION_TEST_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAFcSURBVHhe7ZKBisMwGIL7/i/d4+c8OMa/YW1iyuIHInRtNLLj3JwMAN+WDADflqUDHMdv/J+vYFlyXfpVK7Cndhd/lRNr2rvLvnvuwJLUXbD0n+730mymJnQXKn2ie780i2knd5cosdz59grDT+2KlxS6c0ojGXrarLKzzi2GnNQVLI2kO790l9snzCj1idF58tddkZKDLrekcPmrLri0gq5H6QqX3u7CSqu504l+swt5uhiG/AOeKoavHYBFHuCJKP0yAJxCCXCi9MsAcAolwInSLwPAKZQAJ0q/DACnUAKcKP0yAJxCCXCi9MsAcAolwInSLwPAKZQAJ0q/DACnUAKcKP0yAJxCCXCi9MsAcAolwInSLwPAKZQAJ0q/DACnUAKcKP0yAJxCCXCi9MsAcAolwInSTx7g6WLJAHCKLuipYrk0wDeSAeDbkgHg25IB4NuSAeDbsvkA5/kDmI4NFRg3/eEAAAAASUVORK5CYII=";

const DEFAULT_QWEN_REQUEST_TIMEOUT_MS = 120000;
const QWEN_CONNECTION_TEST_TIMEOUT_MS = 30000;

function validImage(image) {
  return typeof image === "string" && /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(image);
}

function extractChatCompletionText(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.map((item) => (typeof item === "string" ? item : item?.text || "")).join("\n").trim();
  }
  return "";
}

const parseObservationJson = parseJsonObject;

function summarizeQwenError(data, fallback) {
  const error = data?.error || {};
  return {
    code: String(error.code || data?.code || "").slice(0, 80),
    message: String(error.message || data?.message || fallback || "Qwen 调用失败").slice(0, 160),
  };
}

function logQwenDebug(summary) {
  if (process.env.MODEL_DEBUG !== "1") return;
  console.warn("qwen_vision_debug", summary);
}

function logQwenFallback(summary) {
  console.warn("qwen_vision_v2_fallback", summary);
}

function qwenError(code, stage, httpStatus) {
  const error = new Error(code);
  error.provider = "qwen";
  error.model = stage?.model || "";
  error.baseUrlHost = stage?.baseUrlHost || "";
  error.configSource = stage ? `${stage.settingsSource}/${stage.baseUrlSource}` : "";
  error.httpStatus = httpStatus || undefined;
  error.errorCode = String(code || "qwen_request_failed").split(":")[0];
  return error;
}

async function generateQwenVisionObservation({
  images,
  image,
  modelConfig = {},
  runtimeStage,
  prompt = HTP_VISUAL_V1,
  maxTokens = 2200,
  parseObservation = true,
  analysisVersion = "v1",
  requestTimeoutMs = DEFAULT_QWEN_REQUEST_TIMEOUT_MS,
}) {
  const selectedImage = Array.isArray(images) ? images[0] : image || images;
  const stage = runtimeStage || resolveModelRuntimeConfig(modelConfig, {
    source: modelConfig?.source || "default",
  }).vision;
  if (stage.provider !== "qwen") throw qwenError("qwen_runtime_provider_mismatch", stage);
  if (!validImage(selectedImage)) throw qwenError("qwen_received_invalid_image", stage);

  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) throw qwenError("qwen_api_key_missing", stage);
  if (!stage.baseUrl || !stage.requestUrl) throw qwenError("qwen_base_url_missing", stage);
  if (!stage.model) throw qwenError("qwen_model_not_configured", stage);

  let response;
  let responseText = "";
  const timeoutMs = Number.isFinite(Number(requestTimeoutMs))
    ? Math.min(Math.max(Number(requestTimeoutMs), 1000), DEFAULT_QWEN_REQUEST_TIMEOUT_MS)
    : DEFAULT_QWEN_REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    response = await fetch(stage.requestUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: stage.model,
        messages: [
          { role: "system", content: QWEN_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: selectedImage } },
            ],
          },
        ],
        max_tokens: maxTokens,
        temperature: 0.2,
        stream: false,
      }),
      signal: controller.signal,
    });
    responseText = await response.text();
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    logQwenDebug({
      model: stage.model,
      baseUrlHost: stage.baseUrlHost,
      configSource: `${stage.settingsSource}/${stage.baseUrlSource}`,
      status: 0,
      errorCode: timedOut ? "request_timeout" : "network_error",
      errorSummary: timedOut ? `request exceeded ${timeoutMs}ms` : String(error?.message || "request failed").slice(0, 160),
    });
    throw qwenError(timedOut ? "qwen_request_timeout" : "qwen_request_failed", stage);
  } finally {
    clearTimeout(timeout);
  }

  let data = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw qwenError(response.ok ? "qwen_vision_json_parse_failed" : "qwen_request_failed", stage, response.status);
  }

  if (!response.ok) {
    const summary = summarizeQwenError(data, "Qwen 调用失败");
    logQwenDebug({
      model: stage.model,
      baseUrlHost: stage.baseUrlHost,
      configSource: `${stage.settingsSource}/${stage.baseUrlSource}`,
      status: response.status,
      errorCode: summary.code,
      errorSummary: summary.message,
    });
    const detail = [response.status, summary.code, summary.message].filter(Boolean).join(":");
    throw qwenError(detail ? `qwen_request_failed:${detail}` : "qwen_request_failed", stage, response.status);
  }

  const content = extractChatCompletionText(data);
  if (!content) throw qwenError("qwen_response_empty", stage, response.status);
  if (!parseObservation) return content;
  if (analysisVersion === "v2" && data?.choices?.[0]?.finish_reason === "length") {
    throw qwenError("qwen_vision_v2_response_truncated", stage, response.status);
  }
  let observation;
  try {
    const parsed = parseJsonObject(
      content,
      analysisVersion === "v2" ? "qwen_vision_v2_parse_failed" : "qwen_vision_json_parse_failed"
    );
    observation = analysisVersion === "v2" ? sanitizeV2AnalysisPackage(parsed) : parsed;
  } catch (error) {
    throw qwenError(error?.message || "qwen_vision_json_parse_failed", stage, response.status);
  }
  if (observation.error) {
    const error = qwenError(String(observation.error).slice(0, 120), stage);
    error.detail = String(observation.message || "Qwen 无法完成客观图像观察").slice(0, 160);
    throw error;
  }
  return observation;
}

function v2ParseFailure(error) {
  const code = String(error?.message || "").split(":")[0];
  return code === "qwen_vision_v2_parse_failed"
    || code === "qwen_vision_v2_schema_invalid"
    || code === "qwen_vision_v2_response_truncated";
}

async function generateQwenVisionAnalysis({ images, image, modelConfig = {}, runtimeStage }) {
  try {
    return await generateQwenVisionObservation({
      images,
      image,
      modelConfig,
      runtimeStage,
      prompt: HTP_VISUAL_HYPOTHESIS_V2,
      maxTokens: 6500,
      analysisVersion: "v2",
    });
  } catch (error) {
    if (!v2ParseFailure(error)) throw error;
    const stage = runtimeStage || resolveModelRuntimeConfig(modelConfig, {
      source: modelConfig?.source || "default",
    }).vision;
    logQwenFallback({
      model: stage.model,
      baseUrlHost: stage.baseUrlHost,
      configSource: `${stage.settingsSource}/${stage.baseUrlSource}`,
      status: error.httpStatus || 0,
      errorCode: String(error.message || "qwen_vision_v2_parse_failed").split(":")[0],
      fallbackPrompt: "HTP_VISUAL_V1",
    });
    const legacy = await generateQwenVisionObservation({
      images,
      image,
      modelConfig,
      runtimeStage: stage,
      prompt: HTP_VISUAL_V1,
      maxTokens: 2200,
      analysisVersion: "v1",
    });
    return normalizeV1Observation(legacy);
  }
}

async function testQwenVisionConnection({ runtimeStage }) {
  await generateQwenVisionObservation({
    image: QWEN_CONNECTION_TEST_IMAGE,
    runtimeStage,
    prompt: "This is a non-student connection test image. Reply only with: connection_ok",
    maxTokens: 16,
    parseObservation: false,
    requestTimeoutMs: QWEN_CONNECTION_TEST_TIMEOUT_MS,
  });
}

module.exports = {
  HTP_VISUAL_V1,
  HTP_VISUAL_HYPOTHESIS_V2,
  generateQwenVisionAnalysis,
  generateQwenVisionObservation,
  parseObservationJson,
  testQwenVisionConnection,
};
