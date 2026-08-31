const { parseJsonObject, sanitizeV2AnalysisPackage } = require("./htpVisualAnalysis");
const { assertReportFactConsistency } = require("./analysisConsistencyService");
const { HTP_MULTIMODAL_FULL_V1 } = require("./prompts/htpMultimodalPrompt");
const { buildFactSnapshot, importantFactsNeedingConfirmation } = require("./visualFactSnapshot");

function tokenNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function normalizeUsage(usage = {}) {
  const inputTokens = tokenNumber(usage.inputTokens ?? usage.input_tokens ?? usage.prompt_tokens);
  const outputTokens = tokenNumber(usage.outputTokens ?? usage.output_tokens ?? usage.completion_tokens);
  const rawReasoningTokens = usage.reasoningTokens
    ?? usage.reasoning_tokens
    ?? usage.completion_tokens_details?.reasoning_tokens
    ?? usage.output_tokens_details?.reasoning_tokens;
  const reasoningTokens = rawReasoningTokens === undefined || rawReasoningTokens === null
    ? null
    : tokenNumber(rawReasoningTokens);
  return {
    inputTokens,
    outputTokens,
    completionTokens: outputTokens,
    reasoningTokens,
    totalTokens: tokenNumber(usage.totalTokens ?? usage.total_tokens) || inputTokens + outputTokens,
  };
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function reportEndingLooksIncomplete(reportMarkdown) {
  const text = String(reportMarkdown || "").trim().replace(/[`*_#>\s]+$/g, "");
  if (!text) return true;
  return !/[。！？.!?；;：:…）)\]】》”’\"']$/.test(text);
}

function canonicalObservation(item, section, index) {
  const source = item && typeof item === "object" && !Array.isArray(item) ? item : {};
  const rawText = typeof item === "string" ? item.trim() : "";
  const description = safeString(source.description, safeString(source.observation, rawText || "模型未提供可验证的观察描述"));
  const confidence = ["high", "medium", "low"].includes(source.confidence) ? source.confidence : "low";
  const salience = ["high", "medium", "low", "unknown"].includes(source.psychological_salience)
    ? source.psychological_salience
    : "unknown";
  return {
    ...source,
    observation_id: safeString(source.observation_id, `OBS-${section.toUpperCase()}-${String(index + 1).padStart(3, "0")}`),
    object: safeString(source.object, section),
    feature: safeString(source.feature, "未分类视觉观察"),
    description,
    visual_evidence: safeString(source.visual_evidence, description),
    confidence,
    psychological_salience: salience,
  };
}

function canonicalizePacket(packetInput) {
  const packet = structuredClone(packetInput);
  const sections = ["overall", "house", "tree", "person", "formal_elements"];
  packet.visual_observations = packet.visual_observations && typeof packet.visual_observations === "object"
    ? packet.visual_observations
    : {};
  for (const section of sections) {
    const items = Array.isArray(packet.visual_observations[section]) ? packet.visual_observations[section] : [];
    packet.visual_observations[section] = items.map((item, index) => canonicalObservation(item, section, index));
  }

  packet.salient_features = (Array.isArray(packet.salient_features) ? packet.salient_features : []).map((item, index) => {
    const source = canonicalObservation(item, "salient", index);
    return { ...source, needs_human_visual_confirmation: typeof item?.needs_human_visual_confirmation === "boolean" ? item.needs_human_visual_confirmation : source.confidence !== "high" };
  });
  packet.hypothesis_candidates = (Array.isArray(packet.hypothesis_candidates) ? packet.hypothesis_candidates : []).map((item, index) => ({
    ...(item && typeof item === "object" ? item : {}),
    hypothesis_id: safeString(item?.hypothesis_id, `H${index + 1}`),
    theme: safeString(item?.theme, "待进一步了解的主题"),
    based_on_observation_ids: Array.isArray(item?.based_on_observation_ids) ? item.based_on_observation_ids : [],
    knowledge_card_ids: [],
    source_basis: ["model_general_knowledge"],
    provisional_hypothesis: safeString(item?.provisional_hypothesis, "需要通过 Inquiry 核对的初步工作假设"),
    why_worth_exploring: safeString(item?.why_worth_exploring, "需要结合创作者说明进一步了解"),
    alternative_explanations: Array.isArray(item?.alternative_explanations) ? item.alternative_explanations : [],
    supporting_information_needed: Array.isArray(item?.supporting_information_needed) ? item.supporting_information_needed : [],
    disconfirming_information: Array.isArray(item?.disconfirming_information) ? item.disconfirming_information : [],
    requires_inquiry: typeof item?.requires_inquiry === "boolean" ? item.requires_inquiry : true,
    user_facing_allowed: typeof item?.user_facing_allowed === "boolean" ? item.user_facing_allowed : false,
    sensitivity: ["low", "medium", "high"].includes(item?.sensitivity) ? item.sensitivity : "medium",
  }));
  packet.priority_questions = (Array.isArray(packet.priority_questions) ? packet.priority_questions : []).map((item, index) => ({
    ...(item && typeof item === "object" ? item : {}),
    question_id: safeString(item?.question_id, `Q${index + 1}`),
    question: safeString(item?.question, "建议由教师结合原图进一步询问。"),
    purpose: safeString(item?.purpose, "核对模型的初步理解"),
    related_hypothesis_ids: Array.isArray(item?.related_hypothesis_ids) ? item.related_hypothesis_ids : [],
  }));
  return packet;
}

function standardizeMultimodalResult({ rawText, provider, model, usage, latencyMs, requestId, finishReason, truncated, performance = {} }) {
  const parseStartedAt = Date.now();
  let parsed;
  try {
    parsed = parseJsonObject(rawText, `${provider}_multimodal_json_parse_failed`);
  } catch (error) {
    error.performanceDiagnostics = {
      ...performance,
      responseParseMs: Number(performance.responseParseMs || 0) + (Date.now() - parseStartedAt),
      responseBodyComplete: performance.responseBodyComplete === true,
      rawResponseChars: String(rawText || "").length,
      jsonTruncation: true,
      jsonTruncationReason: "json_parse_failed",
      reportTruncation: false,
      reportTruncationReason: "not_available",
    };
    throw error;
  }
  const packetInput = parsed.analysisPacket || parsed.analysis_packet;
  if (!packetInput || typeof packetInput !== "object") throw new Error("multimodal_analysis_packet_missing");
  if (!packetInput.verification_checks?.chimney_and_smoke) throw new Error("multimodal_analysis_packet_schema_invalid:chimney_and_smoke");
  if (!packetInput.verification_checks?.tree_trunk_width?.absolute_trunk_width) throw new Error("multimodal_analysis_packet_schema_invalid:absolute_trunk_width");
  if (!packetInput.verification_checks?.tree_trunk_width?.crown_to_trunk_ratio) throw new Error("multimodal_analysis_packet_schema_invalid:crown_to_trunk_ratio");
  let analysisPacket;
  try {
    analysisPacket = sanitizeV2AnalysisPackage({
      ...canonicalizePacket(packetInput),
      prompt_version: "HTP_VISUAL_HYPOTHESIS_V2",
    });
  } catch (error) {
    if (String(error?.message || "").startsWith("qwen_vision_v2_schema_invalid:")) {
      const detail = String(error.message).split(":").slice(1).join(":") || "unknown";
      const wrapped = new Error(`${provider}_multimodal_schema_invalid:${detail}`);
      wrapped.provider = provider;
      wrapped.model = model;
      wrapped.errorCode = `${provider}_multimodal_schema_invalid`;
      throw wrapped;
    }
    throw error;
  }
  const reportMarkdown = String(parsed.reportMarkdown || parsed.report_markdown || "").trim();
  if (!reportMarkdown) throw new Error("multimodal_report_missing");
  const responseParseMs = Number(performance.responseParseMs || 0) + (Date.now() - parseStartedAt);
  const consistencyStartedAt = Date.now();
  let consistency;
  try {
    consistency = assertReportFactConsistency(analysisPacket, reportMarkdown);
  } catch (error) {
    error.provider = provider;
    error.model = model;
    error.mode = "single_multimodal";
    error.promptVersion = parsed.promptVersion || HTP_MULTIMODAL_FULL_V1;
    throw error;
  }
  const consistencyCheckMs = Date.now() - consistencyStartedAt;
  const analysisPacketJsonChars = JSON.stringify(analysisPacket).length;
  const reportEndingIncomplete = reportEndingLooksIncomplete(reportMarkdown);
  const reportTruncationReason = truncated
    ? "provider_length"
    : performance.responseBodyComplete === false
      ? "incomplete_response"
      : reportEndingIncomplete
        ? "incomplete_ending"
        : "none";
  const reportTruncation = reportTruncationReason !== "none";
  return {
    success: true,
    mode: "single_multimodal",
    provider,
    model,
    promptVersion: parsed.promptVersion || HTP_MULTIMODAL_FULL_V1,
    analysisPacket,
    factSnapshot: consistency.factSnapshot,
    reportMarkdown,
    usage: normalizeUsage(usage),
    latencyMs: Number(latencyMs) || 0,
    diagnostics: {
      requestId: String(requestId || ""),
      finishReason: String(finishReason || ""),
      truncated: Boolean(truncated),
      factConsistency: consistency.factConsistency,
      performance: {
        ...performance,
        providerLatencyMs: Number(performance.providerLatencyMs || latencyMs || 0),
        responseParseMs,
        consistencyCheckMs,
        inputTokens: normalizeUsage(usage).inputTokens,
        outputTokens: normalizeUsage(usage).outputTokens,
        finishReason: String(finishReason || ""),
        stopReason: String(finishReason || ""),
        responseBodyComplete: performance.responseBodyComplete !== false,
        rawResponseChars: String(rawText || "").length,
        reportMarkdownChars: reportMarkdown.length,
        analysisPacketJsonChars,
        jsonTruncation: false,
        jsonTruncationReason: "none",
        reportTruncation,
        reportTruncationReason,
      },
    },
  };
}

function standardizeVisualOnlyResult({ rawText, provider, model, usage, latencyMs, requestId, finishReason, truncated, performance = {} }) {
  const parseStartedAt = Date.now();
  let parsed;
  try {
    parsed = parseJsonObject(rawText, `${provider}_visual_analysis_json_parse_failed`);
  } catch (error) {
    error.performanceDiagnostics = {
      ...performance,
      responseParseMs: Number(performance.responseParseMs || 0) + (Date.now() - parseStartedAt),
      rawResponseChars: String(rawText || "").length,
      responseBodyComplete: performance.responseBodyComplete === true,
      jsonTruncation: true,
      jsonTruncationReason: "json_parse_failed",
    };
    throw error;
  }
  const packetInput = parsed.analysisPacket || parsed.analysis_packet || parsed;
  let analysisPacket;
  try {
    analysisPacket = sanitizeV2AnalysisPackage({
      ...canonicalizePacket(packetInput),
      prompt_version: "HTP_VISUAL_HYPOTHESIS_V2",
    });
  } catch (error) {
    error.provider = provider;
    error.model = model;
    throw error;
  }
  const factSnapshot = buildFactSnapshot(analysisPacket);
  const normalizedUsage = normalizeUsage(usage);
  return {
    success: true,
    mode: "visual_only",
    provider,
    model,
    promptVersion: parsed.promptVersion || parsed.prompt_version || "HTP_VISUAL_ANALYSIS_ONLY_V1",
    analysisPacket,
    factSnapshot,
    humanConfirmationNeeded: importantFactsNeedingConfirmation(factSnapshot),
    usage: normalizedUsage,
    latencyMs: Number(latencyMs) || 0,
    diagnostics: {
      requestId: String(requestId || ""),
      finishReason: String(finishReason || ""),
      truncated: Boolean(truncated),
      performance: {
        ...performance,
        providerLatencyMs: Number(performance.providerLatencyMs || latencyMs || 0),
        responseParseMs: Number(performance.responseParseMs || 0) + (Date.now() - parseStartedAt),
        inputTokens: normalizedUsage.inputTokens,
        outputTokens: normalizedUsage.outputTokens,
        finishReason: String(finishReason || ""),
        stopReason: String(finishReason || ""),
        responseBodyComplete: performance.responseBodyComplete !== false,
        rawResponseChars: String(rawText || "").length,
        analysisPacketJsonChars: JSON.stringify(analysisPacket).length,
        jsonTruncation: false,
        jsonTruncationReason: "none",
      },
    },
  };
}

module.exports = { canonicalizePacket, normalizeUsage, reportEndingLooksIncomplete, standardizeMultimodalResult, standardizeVisualOnlyResult };
