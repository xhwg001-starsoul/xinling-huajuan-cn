const { normalizeModelConfig } = require("../config/modelDefaults");
const { resolveModelRuntimeConfig } = require("./modelRuntimeConfigService");
const { parseJsonObject, sanitizeV2AnalysisPackage, normalizeV1Observation } = require("./htpVisualAnalysis");
const { buildHtpMultimodalFullPrompt, HTP_MULTIMODAL_FULL_V1 } = require("./prompts/htpMultimodalPrompt");
const { multimodalProviderRegistry } = require("./multimodalProviderRegistry");
const { documentTitleFromMarkdown, generateTeacherReport, normalizeContentType, selectedPlan } = require("../model-adapters");
const { assertReportFactConsistency } = require("./analysisConsistencyService");

function createRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function traceValue(value, fallback = "-") {
  const normalized = String(value || fallback).replace(/[^a-zA-Z0-9._:>/+-]/g, "_").slice(0, 180);
  return normalized || fallback;
}

function writeModelTrace({ requestId, runtime, status, error }) {
  const single = runtime.analysisMode === "single_multimodal";
  const provider = single ? runtime.multimodal.provider : `${runtime.vision.provider}->${runtime.text.provider}`;
  const model = single ? runtime.multimodal.model : `${runtime.vision.model}->${runtime.text.model}`;
  const parts = [
    `[model-trace] requestId=${traceValue(requestId)}`,
    `analysisMode=${traceValue(runtime.analysisMode)}`,
    `provider=${traceValue(provider)}`,
    `model=${traceValue(model)}`,
    `status=${traceValue(status)}`,
  ];
  if (single) {
    parts.push(`baseUrlHost=${traceValue(runtime.multimodal.baseUrlHost)}`);
    parts.push(`configSource=${traceValue(`${runtime.multimodal.settingsSource}/${runtime.multimodal.baseUrlSource}`)}`);
  }
  if (error?.httpStatus) parts.push(`httpStatus=${traceValue(error.httpStatus)}`);
  if (error) parts.push(`errorCode=${traceValue(error.errorCode || String(error.message || "model_call_failed").split(":")[0])}`);
  console.info(parts.join(" "));
}

function firstImageFrom(images) {
  return Array.isArray(images) ? images[0] : images;
}

function blankLegacyPacket(observationRecord) {
  const legacy = normalizeV1Observation(parseJsonObject(observationRecord, "legacy_visual_observation_invalid"));
  return {
    image_quality: { rating: "usable_with_caution", limitations: ["旧版观察结构未包含完整图像质量字段"], needs_retake: false },
    visual_observations: { overall: [], house: [], tree: [], person: [], formal_elements: [] },
    verification_checks: {},
    salient_features: [],
    hypothesis_candidates: [],
    strengths_and_resources: legacy.strengths_and_resources,
    priority_questions: [],
    safety: { safety_followup_needed: false, reason: "", do_not_infer: [] },
    handoff_summary: JSON.stringify(legacy.legacy_visual_observation),
  };
}

function legacyAnalysisPacket(observationRecord) {
  try {
    const parsed = parseJsonObject(observationRecord, "legacy_visual_observation_invalid");
    if (parsed.prompt_version === "HTP_VISUAL_HYPOTHESIS_V2") return sanitizeV2AnalysisPackage(parsed);
  } catch {
    // The V1 compatibility wrapper below keeps the legacy chain available.
  }
  return blankLegacyPacket(observationRecord);
}

function withFrontendAliases(result, profile) {
  const contentType = normalizeContentType(profile);
  const fallbackTitle = contentType === "心灵对话" ? "心灵对话" : selectedPlan(profile).title;
  return {
    ...result,
    documentTitle: documentTitleFromMarkdown(result.reportMarkdown, fallbackTitle),
    markdown: result.reportMarkdown,
    observationRecord: JSON.stringify(result.analysisPacket),
    providers: result.mode === "legacy_dual_model"
      ? { vision: result.provider.split("->")[0], text: result.provider.split("->")[1] }
      : { vision: result.provider, text: result.provider },
  };
}

async function runSingleMultimodal({ image, profile, knowledgeContext, runtime, requestId, providerRegistry }) {
  const stage = runtime.multimodal;
  const provider = providerRegistry.get(stage.provider);
  const prompt = buildHtpMultimodalFullPrompt({ profile, knowledgeContext });
  const result = await provider.analyzeDrawing({
    image,
    mimeType: String(image).match(/^data:([^;]+);/)?.[1] || "image/jpeg",
    backgroundContext: profile,
    prompt,
    knowledgeContext,
    requestContext: { requestId, runtimeStage: stage },
  });
  return withFrontendAliases(result, profile);
}

async function runLegacyDualModel({ image, profile, runtime, requestId }) {
  const startedAt = Date.now();
  const legacy = await generateTeacherReport({ image, profile, modelConfig: runtime.modelConfig, modelRuntimeConfig: runtime });
  const analysisPacket = legacyAnalysisPacket(legacy.observationRecord);
  const consistency = assertReportFactConsistency(analysisPacket, legacy.markdown);
  const result = {
    success: true,
    mode: "legacy_dual_model",
    provider: `${runtime.vision.provider}->${runtime.text.provider}`,
    model: `${runtime.vision.model}->${runtime.text.model}`,
    promptVersion: "HTP_VISUAL_HYPOTHESIS_V2",
    analysisPacket,
    factSnapshot: consistency.factSnapshot,
    reportMarkdown: legacy.markdown,
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    latencyMs: Date.now() - startedAt,
    diagnostics: { requestId, finishReason: "", truncated: false, factConsistency: consistency.factConsistency },
  };
  return withFrontendAliases(result, profile);
}

async function generateAnalysisWithModelRouter({
  images,
  userInputs = {},
  contentType,
  modelConfig,
  modelRuntimeConfig,
  knowledgeContext = [],
  providerRegistry = multimodalProviderRegistry,
}) {
  const requestId = createRequestId();
  const runtime = modelRuntimeConfig || resolveModelRuntimeConfig(modelConfig || {}, { source: modelConfig?.source || "default" });
  runtime.modelConfig = normalizeModelConfig(runtime.modelConfig);
  runtime.analysisMode = runtime.modelConfig.analysisMode;
  const profile = { ...userInputs, ...(contentType ? { contentType } : {}) };
  try {
    const result = runtime.analysisMode === "single_multimodal"
      ? await runSingleMultimodal({ image: firstImageFrom(images), profile, knowledgeContext, runtime, requestId, providerRegistry })
      : await runLegacyDualModel({ image: firstImageFrom(images), profile, runtime, requestId });
    writeModelTrace({ requestId, runtime, status: "success" });
    return result;
  } catch (error) {
    writeModelTrace({ requestId, runtime, status: "failed", error });
    throw error;
  }
}

module.exports = {
  HTP_MULTIMODAL_FULL_V1,
  generateAnalysisWithModelRouter,
};
