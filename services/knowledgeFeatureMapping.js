const CANONICAL_FEATURES = new Set([
  "house.door.present", "house.door.absent",
  "house.window.present", "house.window.absent",
  "house.chimney.present", "house.chimney.absent",
  "house.smoke.present", "house.smoke.absent", "house.smoke.uncertain",
  "tree.roots.present", "tree.roots.absent",
  "tree.scars.present", "tree.scars.absent",
  "ground_line.present", "ground_line.absent",
  "person.face.present", "person.face.absent",
  "person.hands.present", "person.hands.absent",
  "person.relative_size.small",
  "road.present",
  "formal.text_as_drawing",
  "formal.under_drawing_present",
]);

const INVERSE_GROUPS = [
  ["house.door.present", "house.door.absent"],
  ["house.window.present", "house.window.absent"],
  ["house.chimney.present", "house.chimney.absent"],
  ["house.smoke.present", "house.smoke.absent", "house.smoke.uncertain"],
  ["tree.roots.present", "tree.roots.absent"],
  ["tree.scars.present", "tree.scars.absent"],
  ["ground_line.present", "ground_line.absent"],
  ["person.face.present", "person.face.absent"],
  ["person.hands.present", "person.hands.absent"],
];

const INVERSE_FEATURES = new Map();
for (const group of INVERSE_GROUPS) {
  for (const feature of group) INVERSE_FEATURES.set(feature, new Set(group.filter((item) => item !== feature)));
}

// Only visually reliable, explicitly reviewed mappings belong here. Unmapped cards
// may still act as global context/system rules, but never as feature evidence.
const CARD_FEATURE_MAPPING = new Map([
  ["META_HOUSE_NO_DOOR", [{ code: "house.door.absent" }]],
  ["META_HOUSE_SMOKING_CHIMNEY", [{ code: "house.smoke.present", minConfidence: "high", requires: ["house.chimney.present"] }]],
  ["META_TREE_ROOTS", [{ code: "tree.roots.present" }]],
  ["META_PERSON_VERY_SMALL", [{ code: "person.relative_size.small" }]],
  ["META_PERSON_LOSS_FACIAL", [{ code: "person.face.absent" }]],
  ["TREE_DRAWING_073", [{ code: "tree.scars.present" }]],
  ["META_NSIG_TREE_SCARS", [{ code: "tree.scars.present" }]],
  ["HTP_043", [{ code: "house.window.absent" }]],
]);

const CONFIDENCE_RANK = { low: 1, medium: 2, high: 3 };

function sourceFeatureCodes(card = {}) {
  const values = card.featureCodes || card.feature_codes || card.featureCode || card.feature_code || [];
  return (Array.isArray(values) ? values : [values]).map(String).filter(Boolean);
}

function canonicalRequirementsForCard(card = {}) {
  const requirements = [];
  for (const sourceCode of sourceFeatureCodes(card)) {
    if (CANONICAL_FEATURES.has(sourceCode)) requirements.push({ code: sourceCode });
    for (const mapped of CARD_FEATURE_MAPPING.get(sourceCode) || []) requirements.push({ ...mapped });
  }
  return requirements;
}

function isInverseFeature(left, right) {
  return INVERSE_FEATURES.get(left)?.has(right) || false;
}

function requirementSatisfied(requirement, feature, activeFeatures = []) {
  if (!requirement || !feature || requirement.code !== feature.code) return false;
  if (requirement.minConfidence && (CONFIDENCE_RANK[feature.confidence] || 0) < CONFIDENCE_RANK[requirement.minConfidence]) return false;
  const activeCodes = new Set(activeFeatures.map((item) => typeof item === "string" ? item : item.code));
  return (requirement.requires || []).every((code) => activeCodes.has(code));
}

function cardMatchesFeature(card, feature, activeFeatures = []) {
  return canonicalRequirementsForCard(card).some((requirement) => requirementSatisfied(requirement, feature, activeFeatures));
}

function cardRequirementsSatisfied(card, activeFeatures = []) {
  const requirements = canonicalRequirementsForCard(card);
  return requirements.some((requirement) => activeFeatures.some((feature) => requirementSatisfied(requirement, feature, activeFeatures)));
}

module.exports = {
  CANONICAL_FEATURES,
  CARD_FEATURE_MAPPING,
  INVERSE_FEATURES,
  canonicalRequirementsForCard,
  cardMatchesFeature,
  cardRequirementsSatisfied,
  isInverseFeature,
};
