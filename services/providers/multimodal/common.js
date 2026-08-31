const { normalizeUsage, standardizeMultimodalResult, standardizeVisualOnlyResult } = require("../../multimodalAnalysisResult");

const CONNECTION_TEST_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAFcSURBVHhe7ZKBisMwGIL7/i/d4+c8OMa/YW1iyuIHInRtNLLj3JwMAN+WDADflqUDHMdv/J+vYFlyXfpVK7Cndhd/lRNr2rvLvnvuwJLUXbD0n+730mymJnQXKn2ie780i2knd5cosdz59grDT+2KlxS6c0ojGXrarLKzzi2GnNQVLI2kO790l9snzCj1idF58tddkZKDLrekcPmrLri0gq5H6QqX3u7CSqu504l+swt5uhiG/AOeKoavHYBFHuCJKP0yAJxCCXCi9MsAcAolwInSLwPAKZQAJ0q/DACnUAKcKP0yAJxCCXCi9MsAcAolwInSLwPAKZQAJ0q/DACnUAKcKP0yAJxCCXCi9MsAcAolwInSLwPAKZQAJ0q/DACnUAKcKP0yAJxCCXCi9MsAcAolwInSTx7g6WLJAHCKLuipYrk0wDeSAeDbkgHg25IB4NuSAeDbsvkA5/kDmI4NFRg3/eEAAAAASUVORK5CYII=";

function assertDataImage(image) {
  if (typeof image !== "string" || !/^data:image\/[a-z0-9.+-]+;base64,/i.test(image)) {
    throw new Error("multimodal_image_input_invalid");
  }
}

function providerError(provider, stage, responseStatus, code) {
  const safeCode = String(code || "request_failed").replace(/[^a-z0-9_.-]/gi, "_").slice(0, 100);
  const error = new Error(`${provider}_request_failed${responseStatus ? `:${responseStatus}` : ""}:${safeCode}`);
  error.provider = provider;
  error.model = stage.model;
  error.httpStatus = responseStatus || undefined;
  error.errorCode = `${provider}_request_failed`;
  error.baseUrlHost = stage.baseUrlHost;
  error.configSource = `${stage.settingsSource}/${stage.baseUrlSource}`;
  return error;
}

function analysisTimeoutMs(explicitTimeoutMs) {
  const requested = explicitTimeoutMs ?? process.env.MODEL_ANALYSIS_TIMEOUT_MS ?? 240000;
  const parsed = Number.parseInt(String(requested), 10);
  if (!Number.isFinite(parsed)) return 240000;
  return Math.min(Math.max(parsed, 30000), 600000);
}

async function postJson({ provider, stage, apiKey, body, fetchImpl = fetch, timeoutMs }) {
  const effectiveTimeoutMs = analysisTimeoutMs(timeoutMs);
  const providerStartedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), effectiveTimeoutMs);
  let response;
  try {
    response = await fetchImpl(stage.requestUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    throw providerError(provider, stage, 0, error?.name === "AbortError" ? "timeout" : "network_error");
  }
  let data = {};
  const responseParseStartedAt = Date.now();
  try {
    data = await response.json();
  } catch {
    clearTimeout(timeout);
    if (!response.ok) throw providerError(provider, stage, response.status, "invalid_error_response");
    throw providerError(provider, stage, response.status, "invalid_json_response");
  }
  clearTimeout(timeout);
  if (!response.ok) {
    const error = providerError(provider, stage, response.status, data?.error?.code || data?.code || "http_error");
    error.visionInputUnsupported = /image|vision|multimodal/i.test(String(data?.error?.message || data?.message || ""));
    throw error;
  }
  Object.defineProperty(data, "__performance", {
    value: {
      providerLatencyMs: Date.now() - providerStartedAt,
      responseParseMs: Date.now() - responseParseStartedAt,
      backendProviderTimeoutMs: effectiveTimeoutMs,
      responseBodyComplete: true,
    },
    enumerable: false,
  });
  return data;
}

async function postChatStream({ provider, stage, apiKey, body, fetchImpl = fetch, timeoutMs = 600000 }) {
  const effectiveTimeoutMs = analysisTimeoutMs(timeoutMs);
  const providerStartedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), effectiveTimeoutMs);
  let response;
  try {
    response = await fetchImpl(stage.requestUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, stream: true }),
      signal: controller.signal,
    });
    if (!response.ok) {
      let data = {};
      try { data = await response.json(); } catch { /* Keep the error summary generic. */ }
      throw providerError(provider, stage, response.status, data?.error?.code || data?.code || "http_error");
    }
    if (!response.body) return extractChatResult(await response.json());

    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    let finishReason = "";
    let usage = {};
    let responseParseMs = 0;
    let sawDone = false;
    let malformedEventCount = 0;
    const consumeLine = (line) => {
      const parseStartedAt = Date.now();
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed === "data: [DONE]") {
        sawDone = true;
        responseParseMs += Date.now() - parseStartedAt;
        return;
      }
      if (!trimmed.startsWith("data:")) return;
      let event;
      try { event = JSON.parse(trimmed.slice(5).trim()); } catch {
        malformedEventCount += 1;
        responseParseMs += Date.now() - parseStartedAt;
        return;
      }
      const choice = event?.choices?.[0] || {};
      const content = choice?.delta?.content;
      if (typeof content === "string") {
        text += content;
        if (text.length > 4_000_000) throw providerError(provider, stage, 200, "response_too_large");
      }
      if (choice.finish_reason) finishReason = choice.finish_reason;
      if (event?.usage) usage = event.usage;
      responseParseMs += Date.now() - parseStartedAt;
    };
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      for (const line of lines) consumeLine(line);
    }
    buffer += decoder.decode();
    if (buffer) consumeLine(buffer);
    return {
      text,
      usage,
      finishReason,
      truncated: finishReason === "length",
      performance: {
        providerLatencyMs: Date.now() - providerStartedAt,
        responseParseMs,
        backendProviderTimeoutMs: effectiveTimeoutMs,
        responseBodyComplete: Boolean(sawDone || finishReason),
        streamDoneReceived: sawDone,
        malformedEventCount,
      },
    };
  } catch (error) {
    const safeError = error?.provider === provider
      ? error
      : providerError(provider, stage, 0, error?.name === "AbortError" ? "timeout" : "network_error");
    safeError.performanceDiagnostics = {
      providerLatencyMs: Date.now() - providerStartedAt,
      backendProviderTimeoutMs: effectiveTimeoutMs,
      responseBodyComplete: false,
    };
    throw safeError;
  } finally {
    clearTimeout(timeout);
  }
}

function extractChatResult(data) {
  const choice = data?.choices?.[0] || {};
  return {
    text: String(choice?.message?.content || ""),
    usage: data?.usage || {},
    finishReason: choice?.finish_reason || "",
    truncated: choice?.finish_reason === "length",
    performance: data?.__performance || {},
  };
}

function extractOpenAIResult(data) {
  let text = String(data?.output_text || "");
  if (!text && Array.isArray(data?.output)) {
    text = data.output.flatMap((item) => Array.isArray(item?.content) ? item.content : [])
      .filter((item) => item?.type === "output_text")
      .map((item) => item.text || "")
      .join("");
  }
  const incompleteReason = data?.incomplete_details?.reason || "";
  return {
    text,
    usage: data?.usage || {},
    finishReason: incompleteReason || data?.status || "",
    truncated: data?.status === "incomplete" || incompleteReason === "max_output_tokens",
    performance: data?.__performance || {},
  };
}

function finalize({ raw, provider, stage, startedAt, requestId, performance = {}, outputMode = "full" }) {
  if (!raw.text) throw providerError(provider, stage, 200, "empty_output");
  const combinedPerformance = { ...performance, ...(raw.performance || {}) };
  try {
    const standardize = outputMode === "visual_only" ? standardizeVisualOnlyResult : standardizeMultimodalResult;
    return standardize({
      rawText: raw.text,
      provider,
      model: stage.model,
      usage: raw.usage,
      latencyMs: Date.now() - startedAt,
      requestId,
      finishReason: raw.finishReason,
      truncated: raw.truncated,
      performance: combinedPerformance,
    });
  } catch (error) {
    const normalizedUsage = normalizeUsage(raw.usage);
    error.performanceDiagnostics = {
      ...combinedPerformance,
      ...(error.performanceDiagnostics || {}),
      providerLatencyMs: Number(combinedPerformance.providerLatencyMs || Date.now() - startedAt),
      inputTokens: normalizedUsage.inputTokens,
      outputTokens: normalizedUsage.outputTokens,
      finishReason: String(raw.finishReason || ""),
      stopReason: String(raw.finishReason || ""),
      rawResponseChars: String(raw.text || "").length,
      responseBodyComplete: combinedPerformance.responseBodyComplete !== false,
      jsonTruncation: Boolean(error.performanceDiagnostics?.jsonTruncation),
      reportTruncation: Boolean(raw.truncated || error.performanceDiagnostics?.reportTruncation),
    };
    throw error;
  }
}

module.exports = {
  CONNECTION_TEST_IMAGE,
  analysisTimeoutMs,
  assertDataImage,
  extractChatResult,
  extractOpenAIResult,
  finalize,
  postChatStream,
  postJson,
  providerError,
};
