const REVIEW_STATUSES = new Set(["approved", "needs_human_review", "needs_revision", "rejected", "needs_source_check"]);
const EVIDENCE_LEVELS = new Set(["A", "B", "C", "D", "E"]);
const CARD_ROLES = new Set([
  "administration_guidance", "system_guardrail", "context_guardrail", "interview_guidance",
  "exploratory_hypothesis", "formal_observation", "evidence_context",
]);
const AUTOMATION_POLICIES = new Set([
  "may_support_hypothesis_after_context_and_inquiry", "do_not_surface_without_human_review",
  "may_adjust_question_priority_only", "system_rule_only", "may_generate_nonleading_question",
  "may_enrich_objective_observation", "must_check_before_hypothesis", "reduce_pathology_weight",
  "must_trigger_before_final_interpretation", "trigger_human_safety_protocol",
]);

function array(value) {
  if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined && String(item).trim() !== "");
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

function text(value) {
  const result = String(value ?? "").trim();
  return result || null;
}

function normalizeUserFacing(value) {
  if (value === true || String(value).toLowerCase() === "true") return true;
  if (value === false || String(value).toLowerCase() === "false") return false;
  if (String(value).toLowerCase() === "conditional") return "conditional";
  return null;
}

function normalizeCardRole(value) {
  const role = text(value);
  const aliases = {
    admin_guidance: "administration_guidance",
    system: "system_guardrail",
    context: "context_guardrail",
    interview: "interview_guidance",
    exploratory: "exploratory_hypothesis",
    formal: "formal_observation",
    evidence: "evidence_context",
  };
  return aliases[role] || role;
}

function normalizeKnowledgeCard(input = {}) {
  const sourceIds = [...new Set([
    ...array(input.source_ids || input.sourceIds || input.source_id),
    ...array(input.additional_source_ids || input.additionalSourceIds),
  ].map(String))];
  const featureCodes = array(input.feature_codes || input.featureCodes || input.feature_code).map(String);
  const recommendedQuestions = array(input.recommended_questions || input.recommendedQuestions || input.interview_questions).map(String);
  return {
    cardId: text(input.card_id || input.cardId || input.id),
    title: text(input.title || input.feature_name || input.featureName),
    featureName: text(input.feature_name || input.featureName),
    featureCodes,
    categories: array(input.categories || input.category).map(String),
    tags: array(input.tags).map(String),
    cardRole: normalizeCardRole(input.card_role || input.cardRole),
    claim: text(input.claim || input.source_claim || input.source_claim_short || input.observable_definition),
    possibleHypotheses: array(input.possible_hypotheses || input.possibleHypotheses || input.possible_hypothesis_short).map(String),
    alternativeExplanations: array(input.alternative_explanations || input.alternativeExplanations).map(String),
    doNotInfer: array(input.do_not_infer || input.doNotInfer).map(String),
    recommendedQuestions,
    evidenceLevel: text(input.evidence_level || input.evidenceLevel),
    riskLevel: text(input.risk_level || input.riskLevel) || "medium",
    sourceIds,
    reviewStatus: text(input.review_status || input.reviewStatus),
    automationPolicy: text(input.automation_policy || input.automationPolicy),
    userFacingAllowed: normalizeUserFacing(input.user_facing_allowed ?? input.userFacingAllowed),
    requiresInquiryConfirmation: input.requires_inquiry_confirmation === true
      || input.requiresInquiryConfirmation === true
      || String(input.requires_inquiry_confirmation ?? input.requiresInquiryConfirmation).toLowerCase() === "true",
    developmentalNotes: text(input.developmental_notes || input.development_notes || input.developmentalNotes),
    culturalNotes: text(input.cultural_notes || input.culturalNotes),
    externalEvidenceNote: text(input.external_evidence_note || input.externalEvidenceNote),
  };
}

function auditNormalizedCard(card, sourceIdSet = new Set()) {
  const errors = [];
  const warnings = [];
  if (!card.cardId) errors.push("missing_card_id");
  if (!REVIEW_STATUSES.has(card.reviewStatus)) errors.push("unknown_review_status");
  if (card.reviewStatus === "approved") {
    if (!card.claim && !card.possibleHypotheses.length && !card.recommendedQuestions.length) errors.push("approved_card_missing_content");
    if (!card.sourceIds.length) errors.push("approved_card_missing_source");
    if (sourceIdSet.size && card.sourceIds.some((id) => !sourceIdSet.has(id))) errors.push("approved_card_unknown_source");
  }
  if (!EVIDENCE_LEVELS.has(card.evidenceLevel)) errors.push("unknown_evidence_level");
  if (!CARD_ROLES.has(card.cardRole)) errors.push("unknown_card_role");
  if (!AUTOMATION_POLICIES.has(card.automationPolicy)) errors.push("unknown_automation_policy");
  if (![true, false, "conditional"].includes(card.userFacingAllowed)) errors.push("invalid_user_facing_allowed");
  if (!card.featureCodes.length && !["system_guardrail", "context_guardrail", "evidence_context", "administration_guidance"].includes(card.cardRole)) {
    warnings.push("missing_feature_code");
  }
  return { errors, warnings };
}

function compactKnowledgeCard(card) {
  return {
    card_id: card.cardId,
    card_role: card.cardRole,
    feature_codes: card.featureCodes,
    claim: card.claim,
    possible_hypotheses: card.possibleHypotheses,
    alternative_explanations: card.alternativeExplanations,
    do_not_infer: card.doNotInfer,
    recommended_questions: card.recommendedQuestions,
    evidence_level: card.evidenceLevel,
    automation_policy: card.automationPolicy,
    user_facing_allowed: card.userFacingAllowed,
    requires_inquiry_confirmation: card.requiresInquiryConfirmation,
    review_status: card.reviewStatus,
  };
}

module.exports = {
  AUTOMATION_POLICIES,
  CARD_ROLES,
  EVIDENCE_LEVELS,
  REVIEW_STATUSES,
  auditNormalizedCard,
  compactKnowledgeCard,
  normalizeKnowledgeCard,
  normalizeCardRole,
  normalizeUserFacing,
};
