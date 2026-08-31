const crypto = require("node:crypto");

const CASE_ANALYSIS_CORE_SCHEMA_VERSION = "1.0";

function safeContext(profile = {}) {
  return {
    ageRange: String(profile.ageRange || ""),
    gender: String(profile.gender || ""),
    grade: String(profile.grade || ""),
    drawingContext: String(profile.drawingContext || ""),
    recentBehavior: String(profile.recentBehavior || ""),
    teacherConcern: String(profile.teacherConcern || ""),
    studentNarrative: String(profile.studentNarrative || ""),
    riskInfo: String(profile.riskInfo || ""),
  };
}

function selectedKnowledgeContext(context = {}) {
  return [
    ...(context.guardrailCards || []),
    ...(context.evidenceCards || []),
    ...(context.hypothesisCards || []),
    ...(context.interviewCards || []),
    ...(context.restrictedCards || []),
  ];
}

function buildCaseAnalysisCore({ analysisPacket, factSnapshot, humanConfirmationNeeded = [], knowledgeContext = {}, profile = {}, imageMetadata = {} }) {
  const core = {
    schemaVersion: CASE_ANALYSIS_CORE_SCHEMA_VERSION,
    caseCoreId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    visualAnalysis: {
      analysisPacket,
      criticalVisualFacts: factSnapshot,
      humanConfirmationNeeded,
      imageMetadata,
    },
    knowledge: {
      knowledgeBaseVersion: String(knowledgeContext.knowledgeBaseVersion || ""),
      retrievalVersion: String(knowledgeContext.retrievalVersion || ""),
      status: String(knowledgeContext.diagnostics?.knowledgeStatus || "model_general_knowledge"),
      totalCardCount: Number(knowledgeContext.totalCardCount || 0),
      approvedCardCount: Number(knowledgeContext.approvedCardCount || 0),
      runtimeUsableCardCount: Number(knowledgeContext.runtimeUsableCardCount || knowledgeContext.usableCardCount || 0),
      matchedCardCount: Number(knowledgeContext.matchedCardCount || knowledgeContext.matchedCardIds?.length || 0),
      matchedFeatureCodes: Array.isArray(knowledgeContext.matchedFeatureCodes) ? knowledgeContext.matchedFeatureCodes : [],
      matchedCardIds: Array.isArray(knowledgeContext.matchedCardIds) ? knowledgeContext.matchedCardIds : [],
      selectedContext: selectedKnowledgeContext(knowledgeContext),
    },
    hypotheses: Array.isArray(analysisPacket?.hypothesis_candidates) ? analysisPacket.hypothesis_candidates : [],
    strengthsAndResources: Array.isArray(analysisPacket?.strengths_and_resources) ? analysisPacket.strengths_and_resources : [],
    priorityQuestions: Array.isArray(analysisPacket?.priority_questions) ? analysisPacket.priority_questions : [],
    safety: analysisPacket?.safety && typeof analysisPacket.safety === "object" ? analysisPacket.safety : {},
    context: safeContext(profile),
  };
  assertCaseAnalysisCore(core);
  return core;
}

function assertCaseAnalysisCore(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("case_analysis_core_invalid");
  if (value.schemaVersion !== CASE_ANALYSIS_CORE_SCHEMA_VERSION) throw new Error("case_analysis_core_version_invalid");
  if (!value.visualAnalysis?.analysisPacket || !value.visualAnalysis?.criticalVisualFacts) throw new Error("case_analysis_core_visual_missing");
  const serialized = JSON.stringify(value);
  if (serialized.length > 1_500_000) throw new Error("case_analysis_core_too_large");
  if (/data:image\//i.test(serialized) || /;base64,/i.test(serialized)) throw new Error("case_analysis_core_contains_image");
  return value;
}

module.exports = { CASE_ANALYSIS_CORE_SCHEMA_VERSION, assertCaseAnalysisCore, buildCaseAnalysisCore };
