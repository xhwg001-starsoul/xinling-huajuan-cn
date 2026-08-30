const { factSnapshotFromPacket } = require("../analysis-fact-dto");

function buildFactSnapshot(analysisPacket = {}) {
  return factSnapshotFromPacket(analysisPacket);
}

function importantFactsNeedingConfirmation(snapshot) {
  const candidates = [
    ["chimney.present", snapshot.chimney.present, snapshot.chimney.confidence],
    ["smoke.present", snapshot.smoke.present, snapshot.smoke.confidence],
    ["treeTrunk.absoluteWidth", snapshot.treeTrunk.absoluteWidth, snapshot.treeTrunk.confidence],
    ["treeTrunk.crownToTrunkRatio", snapshot.treeTrunk.crownToTrunkRatio, snapshot.treeTrunk.confidence],
    ["treeScars.present", snapshot.treeScars.present, snapshot.treeScars.confidence],
    ["roots.present", snapshot.roots.present, snapshot.roots.confidence],
    ["groundLine.present", snapshot.groundLine.present, snapshot.groundLine.confidence],
    ["house.doorPresent", snapshot.house.doorPresent, snapshot.house.confidence],
    ["person.handsPresent", snapshot.person.handsPresent, snapshot.person.handsConfidence],
    ["person.facialFeaturesPresent", snapshot.person.facialFeaturesPresent, snapshot.person.facialFeaturesConfidence],
  ];
  return candidates
    .filter(([, value, factConfidence]) => value === "uncertain" || factConfidence === "low")
    .map(([fact, value, factConfidence]) => ({ fact, value, confidence: factConfidence }));
}

module.exports = { buildFactSnapshot, importantFactsNeedingConfirmation };
