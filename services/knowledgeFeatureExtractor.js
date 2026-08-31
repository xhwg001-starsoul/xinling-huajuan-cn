const { buildFactSnapshot } = require("./visualFactSnapshot");

function addFeature(target, code, confidence = "medium", extra = {}) {
  if (!code) return;
  const existing = target.find((item) => item.code === code);
  const observationIds = [...new Set(extra.observationIds || [])];
  if (existing) {
    existing.observationIds = [...new Set([...(existing.observationIds || []), ...observationIds])];
    return;
  }
  target.push({ code, confidence: ["high", "medium", "low"].includes(confidence) ? confidence : "low", uncertain: /\.uncertain$/.test(code), ...extra, observationIds });
}

function collectObservations(packet = {}) {
  const output = [];
  const seen = new Set();
  const add = (item, section) => {
    if (!item || typeof item !== "object") return;
    const id = String(item.observation_id || "").trim();
    const key = id || `${section}:${output.length}`;
    if (seen.has(key)) return;
    seen.add(key);
    output.push({ id, section, object: String(item.object || ""), confidence: String(item.confidence || "low"), text: `${item.feature || ""} ${item.description || ""} ${item.visual_evidence || ""}`.trim() });
  };
  for (const [section, items] of Object.entries(packet.visual_observations || {})) {
    for (const item of Array.isArray(items) ? items : []) add(item, section);
  }
  for (const item of Array.isArray(packet.salient_features) ? packet.salient_features : []) add(item, "salient");
  return output;
}

function observationIds(observations, pattern) {
  return observations.filter((item) => pattern.test(item.text)).map((item) => item.id).filter(Boolean);
}

function positiveTextMatch(text, positive, negative) {
  return positive.test(text) && !(negative && negative.test(text));
}

function featureObservationIds(code, observations) {
  const rules = {
    "house.door.present": /门|door/i, "house.door.absent": /门|door/i,
    "house.window.present": /窗|window/i, "house.window.absent": /窗|window/i,
    "house.chimney.present": /烟囱|chimney/i, "house.chimney.absent": /烟囱|chimney/i,
    "house.smoke.present": /烟|云|smoke|cloud/i, "house.smoke.absent": /烟|云|smoke|cloud/i, "house.smoke.uncertain": /烟|云|smoke|cloud/i,
    "tree.roots.present": /树根|根部|roots?/i, "tree.roots.absent": /树根|根部|roots?/i,
    "tree.scars.present": /树疤|伤痕|疤痕|污点|树洞|孔洞|裂纹|切口|scars?|holes?/i, "tree.scars.absent": /树疤|伤痕|疤痕|污点|树洞|孔洞|裂纹|切口|scars?|holes?/i,
    "ground_line.present": /地面线|草字地面|ground.?line/i, "ground_line.absent": /地面线|ground.?line/i,
    "person.face.present": /五官|眼|嘴|鼻|耳|头发|facial|face/i, "person.face.absent": /五官|眼|嘴|鼻|耳|头发|facial|face/i,
    "person.hands.present": /手|手指|hands?|fingers?/i, "person.hands.absent": /手|手指|hands?|fingers?/i,
    "person.relative_size.small": /人物|人形|person/i,
  };
  return rules[code] ? observationIds(observations, rules[code]) : [];
}

function extractKnowledgeFeatures(analysisPacket = {}, suppliedSnapshot) {
  const snapshot = suppliedSnapshot || buildFactSnapshot(analysisPacket);
  const observations = collectObservations(analysisPacket);
  const features = [];
  const addFact = (code, confidence) => addFeature(features, code, confidence, { observationIds: featureObservationIds(code, observations) });
  const stateCode = (prefix, value) => value === "yes" ? `${prefix}.present` : value === "no" ? `${prefix}.absent` : `${prefix}.uncertain`;

  addFact(stateCode("house.chimney", snapshot.chimney.present), snapshot.chimney.confidence);
  addFact(stateCode("house.smoke", snapshot.smoke.present), snapshot.smoke.confidence);
  if (["thin", "medium", "thick"].includes(snapshot.treeTrunk.absoluteWidth)) addFact(`tree.trunk.width.${snapshot.treeTrunk.absoluteWidth}`, snapshot.treeTrunk.confidence);
  if (["large", "medium", "small"].includes(snapshot.treeTrunk.crownToTrunkRatio)) addFact(`tree.crown_to_trunk_ratio.${snapshot.treeTrunk.crownToTrunkRatio}`, snapshot.treeTrunk.confidence);
  addFact(stateCode("tree.scars", snapshot.treeScars.present), snapshot.treeScars.confidence);
  if (snapshot.treeScars.present === "yes" && (snapshot.treeScars.count || 0) > 1) addFact("tree.scars.multiple", snapshot.treeScars.confidence);
  addFact(stateCode("tree.roots", snapshot.roots.present), snapshot.roots.confidence);
  addFact(stateCode("ground_line", snapshot.groundLine.present), snapshot.groundLine.confidence);
  addFact(stateCode("house.door", snapshot.house.doorPresent), snapshot.house.confidence);
  if (snapshot.house.windowCount === 0) addFact("house.window.absent", snapshot.house.confidence);
  if ((snapshot.house.windowCount || 0) > 0) addFact("house.window.present", snapshot.house.confidence);
  addFact(stateCode("person.hands", snapshot.person.handsPresent), snapshot.person.handsConfidence);
  addFact(stateCode("person.face", snapshot.person.facialFeaturesPresent), snapshot.person.facialFeaturesConfidence);

  for (const item of observations) {
    const text = item.text;
    if (positiveTextMatch(text, /(?:有|画有|出现|可见|通向|沿着).{0,8}(?:道路|小路|路径)|(?:道路|小路|路径).{0,8}(?:存在|通向|延伸|可见)/i, /(?:无|没有|未画|未见|不存在|不含)(?:可辨识的|明显的)?(?:道路|小路|路径)|(?:道路|小路|路径)(?:不存在|未画出|未见)/i)) addFeature(features, "road.present", item.confidence, { observationIds: [item.id].filter(Boolean) });
    if (/火柴人|stick\s*figure/i.test(text)) addFeature(features, "person.form.stick", item.confidence, { observationIds: [item.id].filter(Boolean) });
    if (positiveTextMatch(text, /人物.{0,12}(?:显著|明显|相对|整体|比例)?(?:很小|较小|微小|小于)|(?:很小|较小|微小)的?人物/i, /人物.{0,6}(?:不小|并不小|不是很小)/i)) addFeature(features, "person.relative_size.small", item.confidence, { observationIds: [item.id].filter(Boolean) });
    if (positiveTextMatch(text, /行走|走路|walking/i, /没有行走|未在行走|静止/i)) addFeature(features, "person.dynamic.walking", item.confidence, { observationIds: [item.id].filter(Boolean) });
    if (/大面积留白|上部留白|large blank space/i.test(text)) addFeature(features, "formal.large_blank_space", item.confidence, { observationIds: [item.id].filter(Boolean) });
    const textAsDrawing = /(?:用|以).{0,12}(?:汉字|文字|字词).{0,16}(?:构成|组成|拼出|拼成|代替|绘成).{0,20}(?:房|树|人|房树人|形状|画面)|(?:房|树|人).{0,12}(?:由|用).{0,12}(?:汉字|文字|字词).{0,12}(?:构成|组成|拼成)/i;
    if (textAsDrawing.test(text)) addFeature(features, "formal.text_as_drawing", item.confidence, { observationIds: [item.id].filter(Boolean) });
    if (/底稿|淡铅笔|under.?drawing/i.test(text)) addFeature(features, "formal.under_drawing_present", item.confidence, { observationIds: [item.id].filter(Boolean) });
    if (/多个.{0,3}[“"]?门[”"]?字|门.{0,6}(?:重复|强调)/.test(text)) addFeature(features, "house.door.emphasized", item.confidence, { observationIds: [item.id].filter(Boolean) });
  }
  return features;
}

module.exports = { collectObservations, extractKnowledgeFeatures };
