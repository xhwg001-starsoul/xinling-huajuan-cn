const MAX_OBSERVATIONS = 10;

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function compactObservation(item = {}) {
  const description = String(item.description || item.observation || "");
  const visualEvidence = String(item.visual_evidence || "");
  return {
    observationId: String(item.observation_id || ""),
    object: String(item.object || ""),
    feature: String(item.feature || ""),
    description,
    ...(visualEvidence && visualEvidence !== description ? { visualEvidence } : {}),
    confidence: String(item.confidence || ""),
    salience: String(item.psychological_salience || ""),
  };
}

function prioritizedObservations(packet = {}, limit = MAX_OBSERVATIONS) {
  const referenced = new Set(asArray(packet.hypothesis_candidates).flatMap((item) => asArray(item.based_on_observation_ids)));
  const salient = new Set(asArray(packet.salient_features).map((item) => String(item.observation_id || "")).filter(Boolean));
  const rows = Object.values(packet.visual_observations || {}).flatMap(asArray).map((item, index) => ({ item, index }));
  const confidenceScore = { high: 3, medium: 2, low: 1 };
  const salienceScore = { high: 3, medium: 2, low: 1 };
  rows.sort((a, b) => {
    const score = ({ item }) => (referenced.has(item.observation_id) ? 20 : 0)
      + (salient.has(item.observation_id) ? 10 : 0)
      + (confidenceScore[item.confidence] || 0)
      + (salienceScore[item.psychological_salience] || 0);
    return score(b) - score(a) || a.index - b.index;
  });
  return rows.slice(0, limit).map(({ item }) => compactObservation(item));
}

function compactHypothesis(item = {}) {
  return {
    hypothesisId: String(item.hypothesis_id || ""),
    theme: String(item.theme || ""),
    basedOnObservationIds: asArray(item.based_on_observation_ids),
    provisionalHypothesis: String(item.provisional_hypothesis || ""),
    alternativeExplanations: asArray(item.alternative_explanations),
    supportingInformationNeeded: asArray(item.supporting_information_needed),
    disconfirmingInformation: asArray(item.disconfirming_information),
    knowledgeCardIds: asArray(item.knowledge_card_ids),
    sourceBasis: asArray(item.source_basis),
    requiresInquiry: item.requires_inquiry !== false,
    userFacingAllowed: item.user_facing_allowed === true,
    sensitivity: String(item.sensitivity || ""),
  };
}

function compactKnowledge(item = {}) {
  return {
    id: String(item.card_id || ""),
    role: String(item.card_role || ""),
    evidenceLevel: String(item.evidence_level || ""),
    policy: String(item.automation_policy || ""),
    userFacingAllowed: item.user_facing_allowed === true,
    requiresInquiry: item.requires_inquiry_confirmation === true,
    feature: String(item.matched_feature_code || ""),
  };
}

function uniqueStrings(items) {
  const output = [];
  const seen = new Set();
  for (const item of items.flatMap(asArray)) {
    const value = String(item || "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    output.push(value);
  }
  return output;
}

function buildReportInputView(caseAnalysisCore, { compactMode = false } = {}) {
  const core = caseAnalysisCore || {};
  const packet = core.visualAnalysis?.analysisPacket || {};
  return {
    schemaVersion: "REPORT_INPUT_VIEW_V1",
    compactMode: Boolean(compactMode),
    context: { source: "teacher_profile_in_fixed_prompt" },
    visualFacts: core.visualAnalysis?.criticalVisualFacts || {},
    needsHumanConfirmation: asArray(core.visualAnalysis?.humanConfirmationNeeded),
    observations: prioritizedObservations(packet, compactMode ? 6 : MAX_OBSERVATIONS),
    hypotheses: asArray(core.hypotheses).slice(0, compactMode ? 5 : 8).map(compactHypothesis),
    strengthsAndResources: asArray(core.strengthsAndResources).slice(0, compactMode ? 5 : 8),
    priorityQuestions: asArray(core.priorityQuestions).slice(0, compactMode ? 6 : 10),
    safety: core.safety || {},
    knowledge: {
      knowledgeBaseVersion: String(core.knowledge?.knowledgeBaseVersion || ""),
      status: String(core.knowledge?.status || ""),
      approvedCardCount: Number(core.knowledge?.approvedCardCount || 0),
      matchedCardCount: Number(core.knowledge?.matchedCardCount || asArray(core.knowledge?.matchedCardIds).length),
      globalDoNotInfer: uniqueStrings(asArray(core.knowledge?.selectedContext).map((item) => item?.do_not_infer)),
      globalAlternativeExplanations: uniqueStrings(asArray(core.knowledge?.selectedContext).map((item) => item?.alternative_explanations)),
      cards: asArray(core.knowledge?.selectedContext).map(compactKnowledge),
    },
  };
}

module.exports = { buildReportInputView, prioritizedObservations };
