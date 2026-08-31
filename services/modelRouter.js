const { normalizeModelConfig } = require("../config/modelDefaults");
const { resolveModelRuntimeConfig } = require("./modelRuntimeConfigService");
const { parseJsonObject, sanitizeV2AnalysisPackage, normalizeV1Observation } = require("./htpVisualAnalysis");
const { buildHtpMultimodalFullPrompt, HTP_MULTIMODAL_FULL_V1 } = require("./prompts/htpMultimodalPrompt");
const { multimodalProviderRegistry } = require("./multimodalProviderRegistry");
const { documentTitleFromMarkdown, generateTeacherReport, normalizeContentType, selectedPlan } = require("../model-adapters");
const { assertReportFactConsistency } = require("./analysisConsistencyService");
const { getKnowledgeBaseService } = require("./knowledgeBaseService");
const { assertCaseAnalysisCore, buildCaseAnalysisCore } = require("./caseAnalysisCore");
const { buildHtpVisualAnalysisOnlyPrompt, HTP_VISUAL_ANALYSIS_ONLY_V1 } = require("./prompts/htpVisualAnalysisOnlyPrompt");
const { buildReportFromCaseCorePrompt, HTP_REPORT_FROM_CASE_CORE_V1 } = require("./prompts/htpReportPrompt");
const { generateTextReport, reportMaxTokens, reportProviderTimeoutMs } = require("./reportTextProvider");
const { analysisTimeoutMs } = require("./providers/multimodal/common");
const { imageInputMetadata } = require("./imageInputMetadata");
const { normalizeUsage, reportEndingLooksIncomplete } = require("./multimodalAnalysisResult");
const { assertReportKnowledgePolicy } = require("./reportPolicyValidator");
const { executeVisualWithRetry } = require("./visualRetryPolicy");
const { visualAttemptLogger } = require("./visualAttemptLogger");

const SPLIT_PIPELINE_VERSION = "v0.9.2";

function safeVisualLog(logger, method, event) {
  if (!logger || typeof logger[method] !== "function") return;
  try {
    logger[method](event);
  } catch {
    try { console.warn("[visual-attempt-log] status=write_failed code=logger_failed"); } catch {}
  }
}

function createRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function traceValue(value, fallback = "-") {
  const normalized = String(value || fallback).replace(/[^a-zA-Z0-9._:>/+-]/g, "_").slice(0, 180);
  return normalized || fallback;
}

function writeModelTrace({ requestId, runtime, status, error }) {
  const single = runtime.analysisMode === "single_multimodal";
  const provider = single ? `${runtime.multimodal.provider}->${runtime.report.provider}` : `${runtime.vision.provider}->${runtime.text.provider}`;
  const model = single ? `${runtime.multimodal.model}->${runtime.report.model}` : `${runtime.vision.model}->${runtime.text.model}`;
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

function metricValue(value, fallback = "-") {
  if (value === null) return "none";
  if (value === undefined || value === "") return fallback;
  if (typeof value === "boolean") return value ? "true" : "false";
  return Number.isFinite(Number(value)) ? String(Number(value)) : traceValue(value, fallback);
}

function writePerformanceTrace({ requestId, performance = {}, status }) {
  const fields = [
    ["requestId", requestId],
    ["status", status],
    ["totalPipelineLatencyMs", performance.totalPipelineLatencyMs],
    ["totalLatencyMs", performance.totalLatencyMs],
    ["providerLatencyMs", performance.providerLatencyMs],
    ["imagePreparationMs", performance.imagePreparationMs],
    ["knowledgeRetrievalMs", performance.knowledgeRetrievalMs],
    ["consistencyCheckMs", performance.consistencyCheckMs],
    ["responseParseMs", performance.responseParseMs],
    ["inputTokens", performance.inputTokens],
    ["outputTokens", performance.outputTokens],
    ["finishReason", performance.finishReason],
    ["stopReason", performance.stopReason],
    ["maxTokens", performance.maxTokens],
    ["frontendTimeoutMs", performance.frontendRequestTimeoutMs],
    ["providerTimeoutMs", performance.backendProviderTimeoutMs],
    ["responseBodyComplete", performance.responseBodyComplete],
    ["streamDoneReceived", performance.streamDoneReceived],
    ["malformedStreamEvents", performance.malformedEventCount],
    ["reportChars", performance.reportMarkdownChars],
    ["analysisPacketChars", performance.analysisPacketJsonChars],
    ["jsonTruncation", performance.jsonTruncation],
    ["jsonTruncationReason", performance.jsonTruncationReason],
    ["reportTruncation", performance.reportTruncation],
    ["reportTruncationReason", performance.reportTruncationReason],
    ["visualProviderLatencyMs", performance.visualProviderLatencyMs],
    ["visualAttemptCount", performance.visualAttemptCount],
    ["visualRetryCount", performance.visualRetryCount],
    ["visualRequestedMaxOutputTokens", performance.visualRequestedMaxOutputTokens],
    ["visualProviderReportedOutputTokens", performance.visualProviderReportedOutputTokens],
    ["visualProviderReportedCompletionTokens", performance.visualProviderReportedCompletionTokens],
    ["visualReasoningTokens", performance.visualReasoningTokens],
    ["visualInputTokens", performance.visualInputTokens],
    ["visualOutputTokens", performance.visualOutputTokens],
    ["visualFinishReason", performance.visualFinishReason],
    ["visualMaxTokens", performance.visualMaxTokens],
    ["visualProviderTimeoutMs", performance.visualProviderTimeoutMs],
    ["reportProviderLatencyMs", performance.reportProviderLatencyMs],
    ["reportAttemptCount", performance.reportAttemptCount],
    ["reportRetryCount", performance.reportRetryCount],
    ["reportTotalInputTokens", performance.reportTotalInputTokens],
    ["reportTotalCompletionTokens", performance.reportTotalCompletionTokens],
    ["reportTotalReasoningTokens", performance.reportTotalReasoningTokens],
    ["reportCompactFallbackUsed", performance.reportCompactFallbackUsed],
    ["reportReasoningMode", performance.reportReasoningMode],
    ["reportStatus", performance.reportStatus],
    ["reportInputTokens", performance.reportInputTokens],
    ["reportOutputTokens", performance.reportOutputTokens],
    ["reportFinishReason", performance.reportFinishReason],
    ["reportMaxTokens", performance.reportMaxTokens],
    ["reportProviderTimeoutMs", performance.reportProviderTimeoutMs],
    ["visualReused", performance.visualReused],
  ];
  console.info(`[analysis-performance] ${fields.map(([key, value]) => `${key}=${metricValue(value)}`).join(" ")}`);
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
    providers: ["legacy_dual_model", "split_report_pipeline"].includes(result.mode)
      ? { vision: result.provider.split("->")[0], text: result.provider.split("->")[1] }
      : { vision: result.provider, text: result.provider },
  };
}

function visualProviderTimeoutMs() {
  return analysisTimeoutMs(process.env.VISUAL_PROVIDER_TIMEOUT_MS || 600000);
}

async function runVisualOnly({ image, runtime, requestId, providerRegistry, timeoutMs = visualProviderTimeoutMs() }) {
  const stage = runtime.multimodal;
  const provider = providerRegistry.get(stage.provider);
  const prompt = buildHtpVisualAnalysisOnlyPrompt();
  const result = await provider.analyzeDrawing({
    image,
    mimeType: String(image).match(/^data:([^;]+);/)?.[1] || "image/jpeg",
    prompt,
    requestContext: {
      requestId,
      runtimeStage: stage,
      outputMode: "visual_only",
      maxTokens: 7000,
      timeoutMs,
    },
  });
  return result;
}

function fallbackKnowledgeContext() {
  return {
    knowledgeBaseVersion: "",
    retrievalVersion: "",
    totalCardCount: 0,
    approvedCardCount: 0,
    runtimeUsableCardCount: 0,
    matchedCardCount: 0,
    matchedFeatureCodes: [],
    matchedCardIds: [],
    diagnostics: { knowledgeStatus: "model_general_knowledge" },
  };
}

function usageSum(first = {}, second = {}) {
  const a = normalizeUsage(first);
  const b = normalizeUsage(second);
  const hasReasoning = a.reasoningTokens !== null || b.reasoningTokens !== null;
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    completionTokens: a.completionTokens + b.completionTokens,
    reasoningTokens: hasReasoning ? Number(a.reasoningTokens || 0) + Number(b.reasoningTokens || 0) : null,
    totalTokens: a.totalTokens + b.totalTokens,
  };
}

function knowledgeFromCore(core) {
  return {
    knowledgeBaseVersion: core.knowledge?.knowledgeBaseVersion || "",
    retrievalVersion: core.knowledge?.retrievalVersion || "",
    totalCardCount: Number(core.knowledge?.totalCardCount || 0),
    approvedCardCount: Number(core.knowledge?.approvedCardCount || 0),
    runtimeUsableCardCount: Number(core.knowledge?.runtimeUsableCardCount || 0),
    matchedCardCount: Number(core.knowledge?.matchedCardCount || core.knowledge?.matchedCardIds?.length || 0),
    matchedFeatureCodes: core.knowledge?.matchedFeatureCodes || [],
    matchedCardIds: core.knowledge?.matchedCardIds || [],
    diagnostics: { knowledgeStatus: core.knowledge?.status || "model_general_knowledge" },
  };
}

async function runSplitReportPipeline({ image, caseAnalysisCore: suppliedCore, profile, runtime, requestId, providerRegistry, reportGenerator, knowledgeService = getKnowledgeBaseService(), onStage = () => {}, visualRetryOptions = {} }) {
  let core = suppliedCore ? assertCaseAnalysisCore(structuredClone(suppliedCore)) : null;
  let visualResult = null;
  let knowledgeRetrievalMs = 0;
  const visualReused = Boolean(core);
  let visualRetry = { attempts: [], attemptCount: 0, retryCount: 0, totalLatencyMs: 0, finalStatus: visualReused ? "reused" : "pending" };
  if (!core) {
    onStage("visual");
    const {
      attemptLogger: injectedAttemptLogger,
      onAttempt: externalOnAttempt = () => {},
      ...retryOptions
    } = visualRetryOptions;
    const attemptLogger = injectedAttemptLogger
      || (String(runtime.multimodal.baseUrlHost || "").endsWith(".invalid") ? null : visualAttemptLogger);
    const logAttempt = (attempt) => {
      safeVisualLog(attemptLogger, "attempt", {
        ...attempt,
        requestId,
        provider: runtime.multimodal.provider,
        model: runtime.multimodal.model,
        retryReason: attempt.reason,
        pipelineVersion: SPLIT_PIPELINE_VERSION,
      });
      externalOnAttempt(attempt);
    };
    try {
      const execution = await executeVisualWithRetry({
        ...retryOptions,
        providerTimeoutMs: visualProviderTimeoutMs(),
        attempt: ({ timeoutMs }) => runVisualOnly({ image, runtime, requestId, providerRegistry, timeoutMs }),
        onRetry: ({ reason }) => onStage("visual_retry", { reason }),
        onAttempt: logAttempt,
      });
      visualResult = execution.result;
      visualRetry = execution.diagnostics;
      safeVisualLog(attemptLogger, "stageResult", {
        requestId,
        provider: runtime.multimodal.provider,
        model: runtime.multimodal.model,
        status: "success",
        visualAttemptCount: visualRetry.attemptCount,
        visualRetryCount: visualRetry.retryCount,
        totalVisualLatencyMs: visualRetry.totalLatencyMs,
        finalErrorCode: null,
        pipelineVersion: SPLIT_PIPELINE_VERSION,
      });
    } catch (cause) {
      const error = new Error(`visual_analysis_failed:${String(cause?.message || "unknown_error")}`);
      const visualPerformance = cause?.performanceDiagnostics || {};
      const retryDiagnostics = cause?.visualRetryDiagnostics || visualRetry;
      const finalAttempt = retryDiagnostics.attempts?.at(-1);
      safeVisualLog(attemptLogger, "stageResult", {
        requestId,
        provider: runtime.multimodal.provider,
        model: runtime.multimodal.model,
        status: "failed",
        visualAttemptCount: retryDiagnostics.attemptCount || 1,
        visualRetryCount: retryDiagnostics.retryCount || 0,
        totalVisualLatencyMs: retryDiagnostics.totalLatencyMs,
        finalErrorCode: finalAttempt?.normalizedErrorCode || "provider_error",
        pipelineVersion: SPLIT_PIPELINE_VERSION,
      });
      Object.assign(error, cause, {
        message: `visual_analysis_failed:${String(cause?.message || "unknown_error")}`,
        modelStage: "visual",
        performanceDiagnostics: {
          ...visualPerformance,
          visualProviderLatencyMs: (retryDiagnostics.attempts || []).reduce((total, item) => total + Number(item.latencyMs || 0), 0) || Number(visualPerformance.providerLatencyMs || 0),
          visualMaxTokens: Number(visualPerformance.maxTokens || 7000),
          visualRequestedMaxOutputTokens: Number(visualPerformance.maxTokens || 7000),
          visualAttemptCount: Number(retryDiagnostics.attemptCount || 1),
          visualRetryCount: Number(retryDiagnostics.retryCount || 0),
          visualAttempts: retryDiagnostics.attempts || [],
          visualRetryBudgetMs: Number(retryDiagnostics.totalBudgetMs || 0),
          visualProviderTimeoutMs: Number(visualPerformance.backendProviderTimeoutMs || retryDiagnostics.attempts?.at(-1)?.timeoutMs || visualProviderTimeoutMs()),
          visualReused: false,
        },
        pipelineDiagnostics: {
          pipelineMode: "split_pipeline",
          pipelineVersion: SPLIT_PIPELINE_VERSION,
          visualPromptVersion: HTP_VISUAL_ANALYSIS_ONLY_V1,
          reportPromptVersion: HTP_REPORT_FROM_CASE_CORE_V1,
          visualProvider: runtime.multimodal.provider,
          visualModel: runtime.multimodal.model,
          reportProvider: runtime.report.provider,
          reportModel: runtime.report.model,
          visualCalls: Number(retryDiagnostics.attemptCount || 1),
          reportCalls: 0,
          visualReused: false,
          caseCoreAvailable: false,
        },
      });
      throw error;
    }
    const knowledgeStartedAt = Date.now();
    onStage("knowledge");
    let grounded;
    try {
      grounded = knowledgeService.groundAnalysisPacket({
        analysisPacket: visualResult.analysisPacket,
        factSnapshot: visualResult.factSnapshot,
        outputType: profile.contentType || profile.desiredHelp || profile.reportMode,
        enabled: runtime.modelConfig.knowledgeBaseEnabled !== false,
      });
    } catch {
      grounded = { analysisPacket: visualResult.analysisPacket, knowledgeContext: fallbackKnowledgeContext() };
      console.warn(`[knowledge-retrieval] requestId=${traceValue(requestId)} status=model_general_knowledge`);
    }
    knowledgeRetrievalMs = Date.now() - knowledgeStartedAt;
    core = buildCaseAnalysisCore({
      analysisPacket: grounded.analysisPacket,
      factSnapshot: visualResult.factSnapshot,
      humanConfirmationNeeded: visualResult.humanConfirmationNeeded,
      knowledgeContext: grounded.knowledgeContext,
      profile,
      imageMetadata: imageInputMetadata(image),
    });
  }

  const outputType = normalizeContentType(profile);
  onStage("report");
  let reportResult;
  const reportResults = [];
  const reportAttempts = [];
  const reportAttemptLimit = outputType === "教师专业观察报告" ? 2 : 1;
  for (let attemptNumber = 1; attemptNumber <= reportAttemptLimit; attemptNumber += 1) {
    const compactMode = attemptNumber > 1;
    const reportPrompt = buildReportFromCaseCorePrompt({ caseAnalysisCore: core, profile, outputType, compactMode });
    const attemptStartedAt = Date.now();
    try {
      reportResult = await reportGenerator({ stage: runtime.report, prompt: reportPrompt, outputType, requestId });
    } catch (cause) {
      const error = new Error(`report_generation_failed:${String(cause?.message || "unknown_error")}`);
      const visualPerformance = visualResult?.diagnostics?.performance || {};
      reportAttempts.push({ attemptNumber, compactMode, status: "failed", latencyMs: Date.now() - attemptStartedAt });
      Object.assign(error, cause, {
        message: `report_generation_failed:${String(cause?.message || "unknown_error")}`,
        modelStage: "report",
        caseAnalysisCore: core,
        pipelineDiagnostics: {
          pipelineMode: "split_pipeline",
          pipelineVersion: SPLIT_PIPELINE_VERSION,
          visualPromptVersion: HTP_VISUAL_ANALYSIS_ONLY_V1,
          reportPromptVersion: HTP_REPORT_FROM_CASE_CORE_V1,
          visualProvider: visualResult?.provider || runtime.multimodal.provider,
          visualModel: visualResult?.model || runtime.multimodal.model,
          reportProvider: runtime.report.provider,
          reportModel: runtime.report.model,
          visualCalls: visualReused ? 0 : Number(visualRetry.attemptCount || 1),
          reportCalls: attemptNumber,
          visualReused,
          caseCoreAvailable: true,
        },
        performanceDiagnostics: {
          ...(cause?.performanceDiagnostics || {}),
          visualProviderLatencyMs: (visualRetry.attempts || []).reduce((total, item) => total + Number(item.latencyMs || 0), 0) || Number(visualPerformance.providerLatencyMs || 0),
          visualInputTokens: Number(visualResult?.usage?.inputTokens || 0),
          visualProviderReportedOutputTokens: Number(visualResult?.usage?.outputTokens || 0),
          visualOutputTokens: Number(visualResult?.usage?.outputTokens || 0),
          visualFinishReason: String(visualResult?.diagnostics?.finishReason || ""),
          visualRequestedMaxOutputTokens: Number(visualPerformance.maxTokens || 7000),
          visualMaxTokens: Number(visualPerformance.maxTokens || 7000),
          visualAttemptCount: Number(visualRetry.attemptCount || 0),
          visualRetryCount: Number(visualRetry.retryCount || 0),
          visualAttempts: visualRetry.attempts || [],
          reportAttemptCount: attemptNumber,
          reportAttempts,
          visualProviderTimeoutMs: visualProviderTimeoutMs(),
          analysisPacketChars: JSON.stringify(core.visualAnalysis.analysisPacket).length,
          analysisPacketJsonChars: JSON.stringify(core.visualAnalysis.analysisPacket).length,
          knowledgeRetrievalMs,
          visualReused,
        },
      });
      throw error;
    }
    const truncated = Boolean(reportResult.truncated || reportEndingLooksIncomplete(reportResult.markdown));
    const attemptUsage = normalizeUsage(reportResult.usage);
    reportResults.push(reportResult);
    reportAttempts.push({
      attemptNumber,
      compactMode,
      status: truncated ? "truncated" : "success",
      latencyMs: Date.now() - attemptStartedAt,
      finishReason: String(reportResult.finishReason || ""),
      reportChars: String(reportResult.markdown || "").length,
      visibleOutputChars: String(reportResult.markdown || "").length,
      inputTokens: attemptUsage.inputTokens,
      completionTokens: attemptUsage.completionTokens,
      reasoningTokens: attemptUsage.reasoningTokens,
    });
    if (!truncated) break;
    if (attemptNumber < reportAttemptLimit) onStage("report_retry", { reason: "report_truncation" });
  }

  const visualPerformance = visualResult?.diagnostics?.performance || {};
  const visualUsage = normalizeUsage(visualResult?.usage);
  const reportUsage = reportResults.reduce((total, item) => usageSum(total, item.usage), {});
  const reportTruncation = Boolean(reportResult.truncated || reportEndingLooksIncomplete(reportResult.markdown));
  const phasePerformance = {
    visualProviderLatencyMs: (visualRetry.attempts || []).reduce((total, item) => total + Number(item.latencyMs || 0), 0) || Number(visualPerformance.providerLatencyMs || 0),
    visualInputTokens: visualUsage.inputTokens,
    visualProviderReportedOutputTokens: visualUsage.completionTokens,
    visualProviderReportedCompletionTokens: visualUsage.completionTokens,
    visualReasoningTokens: visualUsage.reasoningTokens,
    visualOutputTokens: visualUsage.outputTokens,
    visualFinishReason: String(visualResult?.diagnostics?.finishReason || ""),
    visualRequestedMaxOutputTokens: Number(visualPerformance.maxTokens || 7000),
    visualMaxTokens: Number(visualPerformance.maxTokens || 7000),
    visualAttemptCount: Number(visualRetry.attemptCount || 0),
    visualRetryCount: Number(visualRetry.retryCount || 0),
    visualAttempts: visualRetry.attempts || [],
    visualRetryBudgetMs: Number(visualRetry.totalBudgetMs || 0),
    analysisPacketChars: JSON.stringify(core.visualAnalysis.analysisPacket).length,
    analysisPacketJsonChars: JSON.stringify(core.visualAnalysis.analysisPacket).length,
    knowledgeRetrievalMs,
    reportProviderLatencyMs: reportResults.reduce((total, item) => total + Number(item.performance?.providerLatencyMs || 0), 0),
    reportInputTokens: reportUsage.inputTokens,
    reportOutputTokens: reportUsage.outputTokens,
    reportTotalInputTokens: reportUsage.inputTokens,
    reportTotalCompletionTokens: reportUsage.completionTokens,
    reportTotalReasoningTokens: reportUsage.reasoningTokens,
    reportFinishReason: String(reportResult.finishReason || ""),
    reportMaxTokens: Number(reportResult.performance?.maxTokens || reportMaxTokens(outputType)),
    reportChars: reportResult.markdown.length,
    reportAttemptCount: reportAttempts.length,
    reportRetryCount: Math.max(0, reportAttempts.length - 1),
    reportCompactFallbackUsed: reportAttempts.length > 1,
    reportReasoningMode: String(reportResult.performance?.reportReasoningMode || "provider_default"),
    reportStatus: reportTruncation ? "truncated" : "ready",
    reportAttempts,
    visualProviderTimeoutMs: Number(visualPerformance.backendProviderTimeoutMs || visualRetry.attempts?.at(-1)?.timeoutMs || visualProviderTimeoutMs()),
    reportProviderTimeoutMs: Number(reportResult.performance?.backendProviderTimeoutMs || reportProviderTimeoutMs()),
    responseBodyComplete: reportResult.performance?.responseBodyComplete !== false,
    jsonTruncation: Boolean(visualPerformance.jsonTruncation),
    reportTruncation,
    reportTruncationReason: reportResult.truncated ? "provider_length" : reportTruncation ? "incomplete_ending" : "none",
    visualReused,
  };
  if (reportTruncation) {
    const error = new Error("report_generation_truncated");
    error.modelStage = "report";
    error.caseAnalysisCore = core;
    error.mode = "split_report_pipeline";
    error.provider = `${visualResult?.provider || "reused"}->${reportResult.provider}`;
    error.model = `${visualResult?.model || "reused"}->${reportResult.model}`;
    error.pipelineDiagnostics = {
      pipelineMode: "split_pipeline",
      pipelineVersion: SPLIT_PIPELINE_VERSION,
      visualPromptVersion: HTP_VISUAL_ANALYSIS_ONLY_V1,
      reportPromptVersion: HTP_REPORT_FROM_CASE_CORE_V1,
      visualProvider: visualResult?.provider || runtime.multimodal.provider,
      visualModel: visualResult?.model || runtime.multimodal.model,
      reportProvider: reportResult.provider,
      reportModel: reportResult.model,
      visualCalls: visualReused ? 0 : Number(visualRetry.attemptCount || 1),
      reportCalls: reportAttempts.length,
      visualReused,
      caseCoreAvailable: true,
    };
    error.performanceDiagnostics = phasePerformance;
    throw error;
  }
  const consistencyStartedAt = Date.now();
  let consistency;
  try {
    assertReportKnowledgePolicy(core, reportResult.markdown);
    consistency = assertReportFactConsistency(core.visualAnalysis.analysisPacket, reportResult.markdown);
  } catch (error) {
    error.caseAnalysisCore = core;
    error.modelStage = "report";
    error.mode = "split_report_pipeline";
    error.provider = `${visualResult?.provider || "reused"}->${reportResult.provider}`;
    error.model = `${visualResult?.model || "reused"}->${reportResult.model}`;
    error.promptVersion = HTP_VISUAL_ANALYSIS_ONLY_V1;
    error.pipelineDiagnostics = {
      pipelineMode: "split_pipeline",
      pipelineVersion: SPLIT_PIPELINE_VERSION,
      visualPromptVersion: HTP_VISUAL_ANALYSIS_ONLY_V1,
      reportPromptVersion: HTP_REPORT_FROM_CASE_CORE_V1,
      visualProvider: visualResult?.provider || runtime.multimodal.provider,
      visualModel: visualResult?.model || runtime.multimodal.model,
      reportProvider: reportResult.provider,
      reportModel: reportResult.model,
      visualCalls: visualReused ? 0 : Number(visualRetry.attemptCount || 1),
      reportCalls: reportAttempts.length,
      visualReused,
      caseCoreAvailable: true,
    };
    error.performanceDiagnostics = { ...phasePerformance, consistencyCheckMs: Date.now() - consistencyStartedAt };
    throw error;
  }
  const consistencyCheckMs = Date.now() - consistencyStartedAt;
  const knowledgeContext = knowledgeFromCore(core);
  return {
    success: true,
    mode: "split_report_pipeline",
    provider: `${visualResult?.provider || runtime.multimodal.provider}->${reportResult.provider}`,
    model: `${visualResult?.model || runtime.multimodal.model}->${reportResult.model}`,
    promptVersion: HTP_VISUAL_ANALYSIS_ONLY_V1,
    analysisPacket: core.visualAnalysis.analysisPacket,
    factSnapshot: core.visualAnalysis.criticalVisualFacts,
    caseAnalysisCore: core,
    reportMarkdown: reportResult.markdown,
    usage: usageSum(visualResult?.usage, reportUsage),
    diagnostics: {
      requestId,
      finishReason: reportResult.finishReason,
      truncated: reportTruncation,
      factConsistency: consistency.factConsistency,
      knowledge: knowledgeDiagnostic(knowledgeContext, runtime.modelConfig.knowledgeBaseEnabled !== false, core.visualAnalysis.analysisPacket),
      performance: {
        ...phasePerformance,
        consistencyCheckMs,
      },
      pipeline: {
        pipelineMode: "split_pipeline",
        pipelineVersion: SPLIT_PIPELINE_VERSION,
        visualPromptVersion: HTP_VISUAL_ANALYSIS_ONLY_V1,
        reportPromptVersion: HTP_REPORT_FROM_CASE_CORE_V1,
        visualProvider: visualResult?.provider || runtime.multimodal.provider,
        visualModel: visualResult?.model || runtime.multimodal.model,
        reportProvider: reportResult.provider,
        reportModel: reportResult.model,
        visualCalls: visualReused ? 0 : Number(visualRetry.attemptCount || 1),
        reportCalls: reportAttempts.length,
        visualReused,
        caseCoreAvailable: true,
      },
    },
  };
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
    diagnostics: {
      requestId,
      finishReason: "",
      truncated: false,
      factConsistency: consistency.factConsistency,
      performance: {
        visualProviderLatencyMs: Number(legacy.visionLatencyMs || 0),
        reportProviderLatencyMs: Number(legacy.textLatencyMs || 0),
        visualReused: false,
      },
      pipeline: {
        pipelineMode: "legacy_dual_model",
        pipelineVersion: "legacy",
        visualPromptVersion: "HTP_VISUAL_HYPOTHESIS_V2",
        reportPromptVersion: "legacy_report_prompt",
        visualProvider: runtime.vision.provider,
        visualModel: runtime.vision.model,
        reportProvider: runtime.text.provider,
        reportModel: runtime.text.model,
        visualCalls: 1,
        reportCalls: 1,
        visualReused: false,
        caseCoreAvailable: false,
      },
    },
  };
  return result;
}

function knowledgeDiagnostic(context = {}, enabled = true, analysisPacket = {}) {
  const groundedHypothesisCount = (analysisPacket.hypothesis_candidates || [])
    .filter((hypothesis) => Array.isArray(hypothesis.knowledge_card_ids) && hypothesis.knowledge_card_ids.length > 0).length;
  return {
    knowledgeEnabled: Boolean(enabled),
    knowledgeStatus: context.diagnostics?.knowledgeStatus || "disabled",
    knowledgeBaseVersion: context.knowledgeBaseVersion || "",
    retrievalVersion: context.retrievalVersion || "",
    totalCardCount: Number(context.totalCardCount || 0),
    approvedCardCount: Number(context.approvedCardCount || 0),
    runtimeUsableCardCount: Number(context.runtimeUsableCardCount || 0),
    matchedCardCount: Number(context.matchedCardCount || context.matchedCardIds?.length || 0),
    matchedFeatureCodes: Array.isArray(context.matchedFeatureCodes) ? context.matchedFeatureCodes : [],
    matchedCardIds: Array.isArray(context.matchedCardIds) ? context.matchedCardIds : [],
    groundedHypothesisCount,
    knowledgeGroundingStatus: groundedHypothesisCount > 0 ? "matched" : "no_approved_match",
  };
}

async function generateAnalysisWithModelRouter({
  images,
  userInputs = {},
  contentType,
  modelConfig,
  modelRuntimeConfig,
  caseAnalysisCore,
  providerRegistry = multimodalProviderRegistry,
  reportGenerator = generateTextReport,
  knowledgeService,
  onStage,
  visualRetryOptions,
}) {
  const totalStartedAt = Date.now();
  const requestId = createRequestId();
  const runtime = modelRuntimeConfig || resolveModelRuntimeConfig(modelConfig || {}, { source: modelConfig?.source || "default" });
  runtime.modelConfig = normalizeModelConfig(runtime.modelConfig);
  runtime.analysisMode = runtime.modelConfig.analysisMode;
  const profile = { ...userInputs, ...(contentType ? { contentType } : {}) };
  try {
    let rawResult = runtime.analysisMode === "single_multimodal"
      ? await runSplitReportPipeline({
        image: firstImageFrom(images),
        caseAnalysisCore,
        profile,
        runtime,
        requestId,
        providerRegistry,
        reportGenerator,
        knowledgeService,
        onStage,
        visualRetryOptions,
      })
      : await runLegacyDualModel({ image: firstImageFrom(images), profile, runtime, requestId });
    if (runtime.analysisMode === "legacy_dual_model") {
      const knowledgeStartedAt = Date.now();
      const grounded = getKnowledgeBaseService().groundAnalysisPacket({
        analysisPacket: rawResult.analysisPacket,
        factSnapshot: rawResult.factSnapshot,
        outputType: profile.contentType || profile.desiredHelp || profile.reportMode,
        enabled: runtime.modelConfig.knowledgeBaseEnabled !== false,
      });
      rawResult = {
        ...rawResult,
        analysisPacket: grounded.analysisPacket,
        diagnostics: {
          ...(rawResult.diagnostics || {}),
          performance: {
            ...(rawResult.diagnostics?.performance || {}),
            knowledgeRetrievalMs: Date.now() - knowledgeStartedAt,
          },
          knowledge: knowledgeDiagnostic(grounded.knowledgeContext, runtime.modelConfig.knowledgeBaseEnabled !== false, grounded.analysisPacket),
        },
      };
    }
    const totalPipelineLatencyMs = Date.now() - totalStartedAt;
    const performance = {
      ...(rawResult.diagnostics?.performance || {}),
      totalPipelineLatencyMs,
      totalLatencyMs: totalPipelineLatencyMs,
      reportMarkdownChars: String(rawResult.reportMarkdown || "").length,
    };
    const result = withFrontendAliases({
      ...rawResult,
      diagnostics: {
        ...(rawResult.diagnostics || {}),
        performance,
      },
    }, profile);
    writeModelTrace({ requestId, runtime, status: "success" });
    writePerformanceTrace({ requestId, performance, status: "success" });
    return result;
  } catch (error) {
    const totalPipelineLatencyMs = Date.now() - totalStartedAt;
    const performance = {
      ...(error.performanceDiagnostics || {}),
      totalPipelineLatencyMs,
      totalLatencyMs: totalPipelineLatencyMs,
      jsonTruncation: Boolean(error.performanceDiagnostics?.jsonTruncation),
      reportTruncation: Boolean(error.performanceDiagnostics?.reportTruncation),
    };
    error.performanceDiagnostics = performance;
    writeModelTrace({ requestId, runtime, status: "failed", error });
    writePerformanceTrace({ requestId, performance, status: "failed" });
    throw error;
  }
}

module.exports = {
  HTP_MULTIMODAL_FULL_V1,
  HTP_VISUAL_ANALYSIS_ONLY_V1,
  SPLIT_PIPELINE_VERSION,
  generateAnalysisWithModelRouter,
  runSplitReportPipeline,
  visualProviderTimeoutMs,
  writePerformanceTrace,
};
