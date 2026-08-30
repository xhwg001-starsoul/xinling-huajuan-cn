const CONFIDENCE = new Set(["high", "medium", "low"]);
const SALIENCE = new Set(["high", "medium", "low", "unknown"]);
const IMAGE_QUALITY = new Set(["good", "usable_with_caution", "insufficient"]);
const TRUNK_WIDTH = new Set(["thick", "medium", "thin", "uncertain"]);
const CROWN_TRUNK_RATIO = new Set(["large", "medium", "small", "uncertain"]);
const PRESENT = new Set(["yes", "no", "uncertain"]);
const SENSITIVITY = new Set(["low", "medium", "high"]);
const OBSERVATION_SECTIONS = ["overall", "house", "tree", "person", "formal_elements"];

function schemaError(code) {
  const error = new Error(`qwen_vision_v2_schema_invalid:${code}`);
  error.errorCode = "qwen_vision_v2_schema_invalid";
  return error;
}

function object(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw schemaError(code);
  return value;
}

function array(value, code) {
  if (!Array.isArray(value)) throw schemaError(code);
  return value;
}

function text(value, code, { allowEmpty = true, max = 4000 } = {}) {
  if (typeof value !== "string") throw schemaError(code);
  const normalized = value.trim().slice(0, max);
  if (!allowEmpty && !normalized) throw schemaError(code);
  return normalized;
}

function enumValue(value, allowed, code) {
  if (!allowed.has(value)) throw schemaError(code);
  return value;
}

function bool(value, code) {
  if (typeof value !== "boolean") throw schemaError(code);
  return value;
}

function stringArray(value, code, maxItems = 30) {
  return array(value, code).slice(0, maxItems).map((item, index) => text(item, `${code}_${index}`, { max: 1000 }));
}

function parseJsonCandidates(rawText) {
  const raw = String(rawText || "").replace(/^\uFEFF/, "").trim();
  const candidates = [raw];
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) candidates.push(raw.slice(firstBrace, lastBrace + 1));
  for (const candidate of [...candidates]) {
    if (candidate) candidates.push(candidate.replace(/,\s*([}\]])/g, "$1"));
  }
  return [...new Set(candidates.filter(Boolean))];
}

function parseJsonObject(rawText, errorCode = "qwen_vision_json_parse_failed") {
  for (const candidate of parseJsonCandidates(rawText)) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      // Try the next bounded candidate without logging model output.
    }
  }
  const error = new Error(errorCode);
  error.errorCode = errorCode;
  throw error;
}

function sanitizeObservation(item, section, index) {
  const source = object(item, `visual_observations_${section}_${index}`);
  return {
    observation_id: text(source.observation_id, `observation_id_${section}_${index}`, { allowEmpty: false, max: 80 }),
    object: text(source.object, `observation_object_${section}_${index}`, { allowEmpty: false, max: 80 }),
    feature: text(source.feature, `observation_feature_${section}_${index}`, { allowEmpty: false, max: 160 }),
    description: text(source.description, `observation_description_${section}_${index}`, { allowEmpty: false }),
    visual_evidence: text(source.visual_evidence, `observation_evidence_${section}_${index}`, { allowEmpty: false }),
    confidence: enumValue(source.confidence, CONFIDENCE, `observation_confidence_${section}_${index}`),
    psychological_salience: enumValue(source.psychological_salience, SALIENCE, `observation_salience_${section}_${index}`),
  };
}

function sanitizeGenericCheck(value, code) {
  return object(value, code);
}

function sanitizeV2AnalysisPackage(input) {
  const source = object(input, "root");
  if (source.prompt_version !== "HTP_VISUAL_HYPOTHESIS_V2") throw schemaError("prompt_version");

  const imageQuality = object(source.image_quality, "image_quality");
  const visualSource = object(source.visual_observations, "visual_observations");
  const visualObservations = {};
  const observationConfidence = new Map();
  for (const section of OBSERVATION_SECTIONS) {
    visualObservations[section] = array(visualSource[section], `visual_observations_${section}`)
      .slice(0, 60)
      .map((item, index) => sanitizeObservation(item, section, index));
    for (const item of visualObservations[section]) observationConfidence.set(item.observation_id, item.confidence);
  }

  const checks = object(source.verification_checks, "verification_checks");
  const trunk = object(checks.tree_trunk_width, "tree_trunk_width");
  const scars = object(checks.tree_scars_holes_damage, "tree_scars_holes_damage");
  const smoke = checks.chimney_and_smoke && typeof checks.chimney_and_smoke === "object"
    ? checks.chimney_and_smoke
    : { chimney_present: "uncertain", smoke_present: "uncertain", smoke_plume_count: null, confidence: "low", evidence: "" };
  const verificationChecks = {
    tree_trunk_width: {
      absolute_judgment: enumValue(trunk.absolute_judgment, TRUNK_WIDTH, "tree_trunk_width_judgment"),
      absolute_trunk_width: enumValue(trunk.absolute_trunk_width || trunk.absolute_judgment, TRUNK_WIDTH, "absolute_trunk_width"),
      crown_to_trunk_ratio: enumValue(
        trunk.crown_to_trunk_ratio === "balanced" ? "medium" : trunk.crown_to_trunk_ratio || "uncertain",
        CROWN_TRUNK_RATIO,
        "crown_to_trunk_ratio",
      ),
      base_width: text(trunk.base_width, "tree_trunk_base_width"),
      middle_width: text(trunk.middle_width, "tree_trunk_middle_width"),
      relation_to_tree_height: text(trunk.relation_to_tree_height, "tree_trunk_relation_height"),
      relation_to_crown: text(trunk.relation_to_crown, "tree_trunk_relation_crown"),
      possible_crown_size_bias: bool(trunk.possible_crown_size_bias, "tree_trunk_crown_bias"),
      confidence: enumValue(trunk.confidence, CONFIDENCE, "tree_trunk_confidence"),
      evidence: text(trunk.evidence, "tree_trunk_evidence"),
    },
    chimney_and_smoke: {
      chimney_present: enumValue(smoke.chimney_present, PRESENT, "chimney_present"),
      smoke_present: enumValue(smoke.smoke_present, PRESENT, "smoke_present"),
      smoke_plume_count: smoke.smoke_plume_count === null ? null : Number.isInteger(smoke.smoke_plume_count) && smoke.smoke_plume_count >= 0 ? smoke.smoke_plume_count : (() => { throw schemaError("smoke_plume_count"); })(),
      confidence: enumValue(smoke.confidence, CONFIDENCE, "smoke_confidence"),
      evidence: text(smoke.evidence, "smoke_evidence"),
    },
    tree_scars_holes_damage: {
      present: enumValue(scars.present, PRESENT, "tree_scars_present"),
      count: scars.count === null ? null : Number.isInteger(scars.count) && scars.count >= 0 ? scars.count : (() => { throw schemaError("tree_scars_count"); })(),
      locations: stringArray(scars.locations, "tree_scars_locations"),
      description: text(scars.description, "tree_scars_description"),
      confidence: enumValue(scars.confidence, CONFIDENCE, "tree_scars_confidence"),
    },
    broken_or_dead_branches: sanitizeGenericCheck(checks.broken_or_dead_branches, "broken_or_dead_branches"),
    roots_and_ground: sanitizeGenericCheck(checks.roots_and_ground, "roots_and_ground"),
    house_openings: sanitizeGenericCheck(checks.house_openings, "house_openings"),
    person_hands_fingers: sanitizeGenericCheck(checks.person_hands_fingers, "person_hands_fingers"),
    person_facial_features: sanitizeGenericCheck(checks.person_facial_features, "person_facial_features"),
    erasures_retracing: sanitizeGenericCheck(checks.erasures_retracing, "erasures_retracing"),
    shading_blackening: sanitizeGenericCheck(checks.shading_blackening, "shading_blackening"),
    repeated_unusual_symbols: sanitizeGenericCheck(checks.repeated_unusual_symbols, "repeated_unusual_symbols"),
    edge_proximity: sanitizeGenericCheck(checks.edge_proximity, "edge_proximity"),
    other_possible_omissions: array(checks.other_possible_omissions, "other_possible_omissions").slice(0, 30),
  };

  const salientFeatures = array(source.salient_features, "salient_features").slice(0, 20).map((item, index) => {
    const feature = object(item, `salient_feature_${index}`);
    const sanitized = {
      observation_id: text(feature.observation_id, `salient_observation_id_${index}`, { allowEmpty: false, max: 80 }),
      object: text(feature.object, `salient_object_${index}`, { allowEmpty: false, max: 80 }),
      feature: text(feature.feature, `salient_feature_name_${index}`, { allowEmpty: false, max: 160 }),
      description: text(feature.description, `salient_description_${index}`, { allowEmpty: false }),
      visual_evidence: text(feature.visual_evidence, `salient_evidence_${index}`, { allowEmpty: false }),
      confidence: enumValue(feature.confidence, CONFIDENCE, `salient_confidence_${index}`),
      psychological_salience: enumValue(feature.psychological_salience, SALIENCE, `salient_psychological_salience_${index}`),
      needs_human_visual_confirmation: bool(feature.needs_human_visual_confirmation, `salient_confirmation_${index}`),
    };
    observationConfidence.set(sanitized.observation_id, sanitized.confidence);
    return sanitized;
  });

  const hypotheses = array(source.hypothesis_candidates, "hypothesis_candidates").slice(0, 10).map((item, index) => {
    const hypothesis = object(item, `hypothesis_${index}`);
    const eligibleIds = stringArray(hypothesis.based_on_observation_ids, `hypothesis_observation_ids_${index}`)
      .filter((id) => observationConfidence.has(id) && observationConfidence.get(id) !== "low");
    if (!eligibleIds.length) return null;
    const sourceBasis = stringArray(hypothesis.source_basis, `hypothesis_source_basis_${index}`)
      .filter((basis) => basis === "model_general_knowledge");
    if (!sourceBasis.length) throw schemaError(`hypothesis_source_basis_${index}`);
    return {
      hypothesis_id: text(hypothesis.hypothesis_id, `hypothesis_id_${index}`, { allowEmpty: false, max: 40 }),
      theme: text(hypothesis.theme, `hypothesis_theme_${index}`, { allowEmpty: false, max: 200 }),
      based_on_observation_ids: eligibleIds,
      knowledge_card_ids: [],
      source_basis: sourceBasis,
      provisional_hypothesis: text(hypothesis.provisional_hypothesis, `provisional_hypothesis_${index}`, { allowEmpty: false }),
      why_worth_exploring: text(hypothesis.why_worth_exploring, `why_worth_exploring_${index}`, { allowEmpty: false }),
      alternative_explanations: stringArray(hypothesis.alternative_explanations, `alternative_explanations_${index}`),
      supporting_information_needed: stringArray(hypothesis.supporting_information_needed, `supporting_information_needed_${index}`),
      disconfirming_information: stringArray(hypothesis.disconfirming_information, `disconfirming_information_${index}`),
      requires_inquiry: bool(hypothesis.requires_inquiry, `requires_inquiry_${index}`),
      user_facing_allowed: bool(hypothesis.user_facing_allowed, `user_facing_allowed_${index}`),
      sensitivity: enumValue(hypothesis.sensitivity, SENSITIVITY, `hypothesis_sensitivity_${index}`),
    };
  }).filter(Boolean);

  const priorityQuestions = array(source.priority_questions, "priority_questions").slice(0, 10).map((item, index) => {
    const question = object(item, `priority_question_${index}`);
    return {
      question_id: typeof question.question_id === "string" && question.question_id.trim()
        ? question.question_id.trim().slice(0, 40)
        : `Q${index + 1}`,
      question: text(question.question, `priority_question_text_${index}`, { allowEmpty: false }),
      purpose: text(question.purpose, `priority_question_purpose_${index}`, { allowEmpty: false }),
      related_hypothesis_ids: stringArray(question.related_hypothesis_ids, `priority_question_hypotheses_${index}`),
    };
  });
  const safety = object(source.safety, "safety");

  return {
    prompt_version: "HTP_VISUAL_HYPOTHESIS_V2",
    image_quality: {
      rating: enumValue(imageQuality.rating, IMAGE_QUALITY, "image_quality_rating"),
      limitations: stringArray(imageQuality.limitations, "image_quality_limitations"),
      needs_retake: bool(imageQuality.needs_retake, "image_quality_needs_retake"),
    },
    visual_observations: visualObservations,
    verification_checks: verificationChecks,
    salient_features: salientFeatures,
    hypothesis_candidates: hypotheses,
    strengths_and_resources: array(source.strengths_and_resources, "strengths_and_resources").slice(0, 30),
    priority_questions: priorityQuestions,
    safety: {
      safety_followup_needed: bool(safety.safety_followup_needed, "safety_followup_needed"),
      reason: text(safety.reason, "safety_reason"),
      do_not_infer: stringArray(safety.do_not_infer, "safety_do_not_infer"),
    },
    handoff_summary: text(source.handoff_summary, "handoff_summary"),
  };
}

function normalizeV1Observation(input) {
  const source = object(input, "v1_root");
  return {
    prompt_version: "HTP_VISUAL_V1",
    fallback_reason: "v2_parse_or_schema_failed",
    legacy_visual_observation: source,
    strengths_and_resources: Array.isArray(source.strengths_and_resources) ? source.strengths_and_resources : [],
  };
}

function approvedKnowledgeContext(cards = []) {
  return Array.isArray(cards) ? cards.filter((card) => card?.review_status === "approved") : [];
}

module.exports = {
  approvedKnowledgeContext,
  normalizeV1Observation,
  parseJsonObject,
  sanitizeV2AnalysisPackage,
};
