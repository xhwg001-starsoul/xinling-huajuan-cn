const assert = require("node:assert/strict");
const { normalizeAdminDiagnosticsPayload } = require("../analysis-fact-dto");

const analysisPacket = {
  verification_checks: {
    chimney_and_smoke: { chimney_present: "yes", smoke_present: "uncertain", smoke_plume_count: 2, confidence: "high" },
    tree_trunk_width: { absolute_trunk_width: "medium", crown_to_trunk_ratio: "large", possible_crown_size_bias: true, confidence: "high" },
    tree_scars_holes_damage: { present: "yes", count: 3, confidence: "high" },
    roots_and_ground: { roots_present: "no", ground_line_present: "no", confidence: "high" },
    house_openings: { door_present: "yes", window_count: 1, confidence: "high" },
    person_hands_fingers: { hands_present: "no", confidence: "high" },
    person_facial_features: { facial_features_present: "no", confidence: "high" },
  },
};

const apiResponseUsingLegacyDto = {
  mode: "single_multimodal",
  provider: "qwen",
  model: "qwen3.8-max",
  promptVersion: "HTP_MULTIMODAL_FULL_V1",
  analysisPacket,
  diagnostics: { factConsistency: { status: "pass", conflicts: [] } },
  adminDiagnostics: {
    imageInput: { width: 1706, height: 1279, mimeType: "image/jpeg", bytes: 456789 },
    visualFacts: { absoluteTrunkWidth: "medium" },
    performance: { totalLatencyMs: 301234, providerLatencyMs: 300900, reportMarkdownChars: 2048, analysisPacketJsonChars: 8192, reportTruncation: false },
  },
};

const dto = normalizeAdminDiagnosticsPayload(apiResponseUsingLegacyDto);
assert.deepEqual(dto.model, {
  analysisMode: "single_multimodal",
  provider: "qwen",
  model: "qwen3.8-max",
  promptVersion: "HTP_MULTIMODAL_FULL_V1",
});
assert.deepEqual(dto.inputImage.original, { width: 1706, height: 1279, mimeType: "image/jpeg", byteLength: 456789 });
assert.deepEqual(dto.inputImage.sentToModel, dto.inputImage.original);
assert.deepEqual(dto.inputImage.preprocessOperations, []);
assert.equal(dto.criticalVisualFacts.smoke.present, "uncertain");
assert.equal(dto.criticalVisualFacts.smoke.plumeCount, 2);
assert.equal(dto.criticalVisualFacts.treeTrunk.absoluteWidth, "medium");
assert.equal(dto.criticalVisualFacts.treeTrunk.crownToTrunkRatio, "large");
assert.equal(dto.criticalVisualFacts.treeTrunk.possibleCrownSizeBias, true);
assert.equal(dto.criticalVisualFacts.treeScars.present, "yes");
assert.equal(dto.criticalVisualFacts.treeScars.count, 3);
assert.equal(dto.criticalVisualFacts.roots.present, "no");
assert.equal(dto.criticalVisualFacts.groundLine.present, "no");
assert.equal(dto.criticalVisualFacts.house.doorPresent, "yes");
assert.equal(dto.criticalVisualFacts.house.windowCount, 1);
assert.equal(dto.criticalVisualFacts.person.handsPresent, "no");
assert.equal(dto.criticalVisualFacts.person.facialFeaturesPresent, "no");
assert.equal(dto.factConsistency.status, "pass");
assert.deepEqual(dto.factConsistency.conflicts, []);
assert(dto.needsHumanConfirmation.some((item) => item.fact === "smoke.present"));
assert.equal(dto.performance.totalLatencyMs, 301234);
assert.equal(dto.performance.providerLatencyMs, 300900);
assert.equal(dto.performance.reportTruncation, false);
assert.doesNotMatch(JSON.stringify(dto), /data:image|base64|api[_-]?key|reportMarkdown"\s*:|studentBackground/i);

console.log("ok - API legacy/new diagnostics fields map to the safe admin frontend DTO");

const extendedPacket = structuredClone(analysisPacket);
extendedPacket.verification_checks.roots_and_ground = { present: "no_roots_but_ground_line", confidence: "high" };
extendedPacket.verification_checks.house_openings = { door_present: "yes_emphasized_by_text", window_present: "no", confidence: "high" };
const extendedDto = normalizeAdminDiagnosticsPayload({ analysisPacket: extendedPacket, adminDiagnostics: {} });
assert.equal(extendedDto.criticalVisualFacts.roots.present, "no");
assert.equal(extendedDto.criticalVisualFacts.groundLine.present, "yes");
assert.equal(extendedDto.criticalVisualFacts.house.doorPresent, "yes");
assert.equal(extendedDto.criticalVisualFacts.house.windowCount, 0);
console.log("ok - extended roots/ground, door and window enums normalize explicitly");

const standardPacket = structuredClone(analysisPacket);
standardPacket.verification_checks.roots_and_ground = { roots_present: "no", ground_line_present: "yes", present: "uncertain", confidence: "high" };
const standardDto = normalizeAdminDiagnosticsPayload({ analysisPacket: standardPacket, adminDiagnostics: {} });
assert.equal(standardDto.criticalVisualFacts.roots.present, "no");
assert.equal(standardDto.criticalVisualFacts.groundLine.present, "yes");
console.log("ok - explicit standard roots/ground fields retain priority");
