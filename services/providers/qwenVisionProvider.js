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

function chatCompletionsUrl(baseUrl) {
  const normalized = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!normalized) throw new Error("qwen_base_url_missing");
  return normalized.endsWith("/chat/completions") ? normalized : `${normalized}/chat/completions`;
}

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

async function generateQwenVisionObservation({ images, image, modelConfig = {} }) {
  const selectedImage = Array.isArray(images) ? images[0] : image || images;
  if (!validImage(selectedImage)) throw new Error("qwen_received_invalid_image");

  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) throw new Error("qwen_api_key_missing");
  const baseUrl = process.env.QWEN_BASE_URL;
  if (!baseUrl) throw new Error("qwen_base_url_missing");
  const model = String(modelConfig.visionModel || process.env.QWEN_VISION_MODEL || "").trim();
  if (!model) throw new Error("qwen_model_not_configured");

  let response;
  try {
    response = await fetch(chatCompletionsUrl(baseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: QWEN_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: QWEN_OBSERVATION_PROMPT },
              { type: "image_url", image_url: { url: selectedImage } },
            ],
          },
        ],
        temperature: 0.2,
        stream: false,
      }),
    });
  } catch (error) {
    logQwenDebug({ status: 0, errorCode: "network_error", errorSummary: String(error?.message || "request failed").slice(0, 160) });
    throw new Error("qwen_request_failed");
  }

  const responseText = await response.text();
  let data = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new Error(response.ok ? "qwen_vision_json_parse_failed" : "qwen_request_failed");
  }

  if (!response.ok) {
    const summary = summarizeQwenError(data, "Qwen 调用失败");
    logQwenDebug({ status: response.status, errorCode: summary.code, errorSummary: summary.message });
    const detail = [response.status, summary.code, summary.message].filter(Boolean).join(":");
    const error = new Error(detail ? `qwen_request_failed:${detail}` : "qwen_request_failed");
    error.httpStatus = response.status;
    throw error;
  }

  const content = extractChatCompletionText(data);
  if (!content) throw new Error("qwen_response_empty");
  const observation = parseObservationJson(content);
  if (observation.error) {
    const error = new Error(String(observation.error).slice(0, 120));
    error.detail = String(observation.message || "Qwen 无法完成客观图像观察").slice(0, 160);
    throw error;
  }
  return observation;
}

module.exports = {
  generateQwenVisionObservation,
  parseObservationJson,
};
