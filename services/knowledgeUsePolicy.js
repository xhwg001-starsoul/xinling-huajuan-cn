const OUTPUT_TYPES = {
  dialogue: "心灵对话",
  professional: "教师专业观察报告",
  interview: "后续访谈问题",
  family: "家校沟通建议",
  record: "辅导记录初稿",
  risk: "风险提示与转介建议",
};

function normalizeOutputType(value) {
  const text = String(value || "");
  if (/访谈/.test(text)) return OUTPUT_TYPES.interview;
  if (/家校/.test(text)) return OUTPUT_TYPES.family;
  if (/辅导记录/.test(text)) return OUTPUT_TYPES.record;
  if (/风险|转介/.test(text)) return OUTPUT_TYPES.risk;
  if (/专业|观察报告/.test(text)) return OUTPUT_TYPES.professional;
  return OUTPUT_TYPES.dialogue;
}

function tentativeEvidence(card) {
  return ["D", "E"].includes(card.evidenceLevel) || card.requiresInquiryConfirmation;
}

function classifyKnowledgeUse(card, outputType, feature = {}) {
  const target = normalizeOutputType(outputType);
  const policy = card.automationPolicy;
  if (card.reviewStatus !== "approved") return { allowed: false, use: "excluded", reason: "not_approved" };
  if (feature.confidence === "low" && !["interview_guidance", "context_guardrail", "system_guardrail"].includes(card.cardRole)) {
    return { allowed: false, use: "excluded", reason: "low_confidence_feature" };
  }
  if (feature.uncertain && !["interview_guidance", "context_guardrail", "system_guardrail"].includes(card.cardRole)) {
    return { allowed: false, use: "excluded", reason: "uncertain_feature_requires_clarification" };
  }
  if (policy === "system_rule_only") return { allowed: true, use: "guardrail", tentative: false };
  if (policy === "do_not_surface_without_human_review") return { allowed: false, use: "restricted", reason: "human_review_required" };
  if (policy === "trigger_human_safety_protocol") {
    return target === OUTPUT_TYPES.risk
      ? { allowed: true, use: "guardrail", tentative: false }
      : { allowed: false, use: "restricted", reason: "safety_protocol_only" };
  }
  if (policy === "may_generate_nonleading_question" || card.cardRole === "interview_guidance") {
    return { allowed: true, use: "interview", tentative: true };
  }
  if (policy === "may_adjust_question_priority_only") return { allowed: true, use: "interview", tentative: true };
  if (["system_guardrail", "context_guardrail"].includes(card.cardRole)) return { allowed: true, use: "guardrail", tentative: false };
  if (target === OUTPUT_TYPES.family || target === OUTPUT_TYPES.record || target === OUTPUT_TYPES.risk) {
    if (card.cardRole === "exploratory_hypothesis") return { allowed: false, use: "restricted", reason: "strict_output_type" };
  }
  if (target === OUTPUT_TYPES.dialogue) {
    if (card.userFacingAllowed === false) return { allowed: false, use: "restricted", reason: "not_user_facing" };
    if (card.userFacingAllowed === "conditional" && !["may_support_hypothesis_after_context_and_inquiry", "reduce_pathology_weight"].includes(policy)) {
      return { allowed: false, use: "restricted", reason: "conditional_policy_not_met" };
    }
  }
  if (card.cardRole === "evidence_context") return { allowed: true, use: "evidence", tentative: tentativeEvidence(card) };
  if (card.cardRole === "formal_observation" && policy === "may_enrich_objective_observation") {
    return { allowed: true, use: "evidence", tentative: tentativeEvidence(card) };
  }
  if (card.cardRole === "exploratory_hypothesis") {
    return { allowed: true, use: "hypothesis", tentative: true };
  }
  if (["must_check_before_hypothesis", "reduce_pathology_weight", "must_trigger_before_final_interpretation"].includes(policy)) {
    return { allowed: true, use: "guardrail", tentative: false };
  }
  return { allowed: false, use: "restricted", reason: "conservative_unknown_use" };
}

module.exports = { OUTPUT_TYPES, classifyKnowledgeUse, normalizeOutputType, tentativeEvidence };
