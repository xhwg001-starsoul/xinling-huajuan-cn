const { resolveModelRuntimeConfig } = require("../modelRuntimeConfigService");

const QWEN_SYSTEM_PROMPT =
  "你是一个严谨的绘画图像观察助手。你只做客观视觉描述，不进行心理诊断。";

const QWEN_OBSERVATION_PROMPT = `请观察这张房树人绘画，输出结构化客观观察 JSON。不要心理诊断，不要下结论。

必须使用以下结构，并只填写客观可见内容；看不清的地方写“不清晰”或“不确定”：
{
  "house": { "exists": true, "position": "", "size": "", "roof": "", "door": "", "windows": "", "walls": "", "smokeOrChimney": "", "details": [], "uncertainty": "" },
  "tree": { "exists": true, "position": "", "size": "", "trunk": "", "crown": "", "roots": "", "branches": "", "leavesOrFruit": "", "details": [], "uncertainty": "" },
  "person": { "exists": true, "position": "", "size": "", "genderPresentationIfVisible": "", "head": "", "face": "", "eyes": "", "mouth": "", "body": "", "arms": "", "hands": "", "legs": "", "feet": "", "clothing": "", "details": [], "uncertainty": "" },
  "overallComposition": { "paperUse": "", "mainPosition": "", "blankSpace": "", "relativeSize": "", "lineQuality": "", "pressureOrStrokeIfVisible": "", "erasuresOrCorrectionsIfVisible": "", "colorUseIfAny": "", "notableFeatures": [], "uncertainty": "" },
  "rawObservationSummary": ""
}

不得出现焦虑、抑郁、缺乏安全感等心理解释或诊断。如果图像不是房树人绘画，请返回：
{ "error": "not_house_tree_person_drawing", "message": "图像似乎不是房树人绘画，无法进行结构化观察。" }`;

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

function parseObservationJson(text) {
  const candidates = [String(text || "").trim()];
  const fenced = String(text || "").match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  const firstBrace = String(text || "").indexOf("{");
  const lastBrace = String(text || "").lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(String(text).slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      // Try the next bounded representation without logging model output.
    }
  }
  throw new Error("qwen_vision_json_parse_failed");
}

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
  prompt = QWEN_OBSERVATION_PROMPT,
  maxTokens = 2200,
  parseObservation = true,
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
  const observation = parseObservationJson(content);
  if (observation.error) {
    const error = qwenError(String(observation.error).slice(0, 120), stage);
    error.detail = String(observation.message || "Qwen 无法完成客观图像观察").slice(0, 160);
    throw error;
  }
  return observation;
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
  generateQwenVisionObservation,
  parseObservationJson,
  testQwenVisionConnection,
};
