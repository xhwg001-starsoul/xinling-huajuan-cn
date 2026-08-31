const { normalizeAdminDiagnosticsPayload } = require("../analysis-fact-dto");
const { evaluateReportFactConsistency } = require("./analysisConsistencyService");
const { buildFactSnapshot, importantFactsNeedingConfirmation } = require("./visualFactSnapshot");
const { buildId, runtimeVersion, serverStartedAt } = require("./runtimeIdentity");

function pngDimensions(buffer) {
  if (buffer.length < 24 || buffer.toString("hex", 0, 8) !== "89504e470d0a1a0a") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > buffer.length) break;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
    }
    offset += segmentLength;
  }
  return null;
}

function imageInputMetadata(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i);
  if (!match) return { mimeType: "", width: null, height: null, bytes: 0 };
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  const dimensions = pngDimensions(buffer) || jpegDimensions(buffer) || {};
  return {
    mimeType: match[1].toLowerCase(),
    width: Number.isInteger(dimensions.width) ? dimensions.width : null,
    height: Number.isInteger(dimensions.height) ? dimensions.height : null,
    bytes: buffer.length,
  };
}

function visualFactSummary(analysisPacket = {}) {
  const checks = analysisPacket.verification_checks || {};
  const smoke = checks.chimney_and_smoke || {};
  const trunk = checks.tree_trunk_width || {};
  const scars = checks.tree_scars_holes_damage || {};
  const smokeCloudObservations = Object.values(analysisPacket.visual_observations || {})
    .flatMap((items) => Array.isArray(items) ? items : [])
    .filter((item) => /烟|云|smoke|cloud/i.test(`${item?.feature || ""} ${item?.description || ""} ${item?.visual_evidence || ""}`))
    .map((item) => ({
      observation_id: item.observation_id || "",
      feature: item.feature || "",
      description: item.description || "",
      visual_evidence: item.visual_evidence || "",
      confidence: item.confidence || "",
    }));
  return {
    smokeCloudDecision: smoke,
    smokeCloudObservations,
    absoluteTrunkWidth: trunk.absolute_trunk_width || trunk.absolute_judgment || "unknown",
    crownToTrunkRatio: trunk.crown_to_trunk_ratio || "unknown",
    scarCount: Number.isInteger(scars.count) ? scars.count : null,
  };
}

function publicImageMetadata(metadata) {
  return {
    width: metadata.width,
    height: metadata.height,
    mimeType: metadata.mimeType,
    byteLength: metadata.bytes,
  };
}

function buildSafeAnalysisDiagnostics({ analysisResult = {}, imageDataUrl, preprocessOperations = [] } = {}) {
  const coreImage = analysisResult.caseAnalysisCore?.visualAnalysis?.imageMetadata || {};
  const input = imageDataUrl
    ? publicImageMetadata(imageInputMetadata(imageDataUrl))
    : {
      width: Number.isInteger(coreImage.width) ? coreImage.width : null,
      height: Number.isInteger(coreImage.height) ? coreImage.height : null,
      mimeType: String(coreImage.mimeType || ""),
      byteLength: Number.isFinite(Number(coreImage.bytes ?? coreImage.byteLength)) ? Number(coreImage.bytes ?? coreImage.byteLength) : null,
    };
  const packet = analysisResult.analysisPacket || {};
  const snapshot = analysisResult.factSnapshot || buildFactSnapshot(packet);
  const legacySummary = visualFactSummary(packet);
  const suppliedConsistency = analysisResult.diagnostics?.factConsistency || analysisResult.factConsistency;
  const reportMarkdown = analysisResult.reportMarkdown || analysisResult.markdown;
  const factConsistency = ["pass", "conflict"].includes(suppliedConsistency?.status)
    ? suppliedConsistency
    : typeof reportMarkdown === "string" && reportMarkdown.trim()
      ? evaluateReportFactConsistency(snapshot, reportMarkdown)
      : { status: "not_checked", conflicts: [] };
  const diagnostics = {
    model: {
      analysisMode: analysisResult.mode || "",
      provider: analysisResult.provider || "",
      model: analysisResult.model || "",
      promptVersion: analysisResult.promptVersion || "",
    },
    inputImage: {
      original: input,
      sentToModel: { ...input },
      preprocessOperations: Array.isArray(preprocessOperations) ? [...preprocessOperations] : [],
    },
    criticalVisualFacts: {
      ...snapshot,
      smokeCloudObservations: legacySummary.smokeCloudObservations,
    },
    needsHumanConfirmation: importantFactsNeedingConfirmation(snapshot),
    factConsistency,
    knowledge: analysisResult.diagnostics?.knowledge || {},
    performance: analysisResult.diagnostics?.performance || {},
    pipeline: analysisResult.diagnostics?.pipeline || {},
    runtime: { serverStartedAt, runtimeVersion, buildId },
  };
  return normalizeAdminDiagnosticsPayload({
    mode: analysisResult.mode,
    provider: analysisResult.provider,
    model: analysisResult.model,
    promptVersion: analysisResult.promptVersion,
    analysisPacket: packet,
    factSnapshot: snapshot,
    adminDiagnostics: diagnostics,
  });
}

module.exports = { buildSafeAnalysisDiagnostics, imageInputMetadata, visualFactSummary };
