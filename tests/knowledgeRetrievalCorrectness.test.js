const assert = require("node:assert/strict");
const path = require("node:path");
const { factSnapshotFromPacket } = require("../analysis-fact-dto");
const { KnowledgeBaseService } = require("../services/knowledgeBaseService");
const { extractKnowledgeFeatures } = require("../services/knowledgeFeatureExtractor");
const { cardMatchesFeature, isInverseFeature } = require("../services/knowledgeFeatureMapping");

let passed = 0;
function test(name, fn) { fn(); passed += 1; console.log(`ok - retrieval ${passed} ${name}`); }

function observation(id, object, feature, description, confidence = "high") {
  return { observation_id: id, object, feature, description, visual_evidence: description, confidence, psychological_salience: "medium" };
}

function basePacket() {
  return {
    visual_observations: { overall: [], house: [], tree: [], person: [], formal_elements: [] },
    verification_checks: {
      tree_trunk_width: { absolute_trunk_width: "medium", crown_to_trunk_ratio: "large", confidence: "high" },
      chimney_and_smoke: { chimney_present: "uncertain", smoke_present: "uncertain", smoke_plume_count: null, confidence: "medium" },
      tree_scars_holes_damage: { present: "no", count: 0, confidence: "high" },
      roots_and_ground: { roots_present: "no", ground_line_present: "no", confidence: "high" },
      house_openings: { door_present: "yes", window_count: 1, confidence: "high" },
      person_hands_fingers: { hands_present: "no", confidence: "high" },
      person_facial_features: { facial_features_present: "no", confidence: "high" },
    },
    salient_features: [],
    hypothesis_candidates: [],
    priority_questions: [],
  };
}

function qiaoFixture() {
  const packet = basePacket();
  packet.verification_checks.chimney_and_smoke = { chimney_present: "yes", smoke_present: "uncertain", smoke_plume_count: 2, confidence: "medium" };
  packet.verification_checks.tree_scars_holes_damage = { present: "yes", count: 3, confidence: "high" };
  packet.verification_checks.person_facial_features = { eyes: "no", mouth: "no", nose: "no", ears: "no", hair: "no", confidence: "high" };
  packet.visual_observations.house = [
    observation("OBS-HOUSE-OPENINGS", "house", "门窗", "房屋有一扇门和一扇窗"),
    observation("OBS-SMOKE", "house", "烟云形态", "烟囱上方两团图形，无法确定是烟还是云", "medium"),
    observation("OBS-NAME", "overall", "姓名文字", "纸张右上角有姓名文字，不参与构成房树人"),
  ];
  packet.visual_observations.tree = [
    observation("OBS-TREE-SCARS", "tree", "树干标记", "树干有三个树疤样伤痕或洞穴标记"),
    observation("OBS-TREE-ROOTS", "tree", "根和地面", "未画树根，也没有地面线"),
  ];
  packet.visual_observations.person = [observation("OBS-PERSON-SMALL", "person", "人物比例", "人物整体很小，显著小于房屋和树；无手且无五官")];
  packet.visual_observations.overall = [observation("OBS-ROAD", "overall", "道路", "有一条道路通向人物")];
  packet.hypothesis_candidates = [
    { hypothesis_id: "H-SCAR", based_on_observation_ids: ["OBS-TREE-SCARS"], source_basis: [], provisional_hypothesis: "树干标记值得询问", alternative_explanations: ["树节或装饰"] },
    { hypothesis_id: "H-SMALL", based_on_observation_ids: ["OBS-PERSON-SMALL"], source_basis: [], provisional_hypothesis: "人物比例值得询问", alternative_explanations: ["构图安排"] },
  ];
  return packet;
}

function textFixture() {
  const packet = basePacket();
  packet.verification_checks.chimney_and_smoke = { chimney_present: "no", smoke_present: "no", smoke_plume_count: 0, confidence: "high" };
  packet.verification_checks.roots_and_ground = { roots_present: "no", ground_line_present: "yes", roots_confidence: "high", ground_line_confidence: "high" };
  packet.verification_checks.house_openings = { door_present: "yes_emphasized_by_text", window_count: 0, confidence: "high" };
  packet.visual_observations.house = [observation("OBS-TEXT-HOUSE", "house", "文字拼画", "用汉字组成房屋和树，多个门字重复强调入口")];
  packet.visual_observations.tree = [observation("OBS-TEXT-GROUND", "tree", "根与地面", "无树根，一整排草字横贯全纸形成地面线")];
  packet.visual_observations.person = [observation("OBS-TEXT-PERSON", "person", "人物比例", "人物整体很小，无手且无五官")];
  packet.visual_observations.formal_elements = [observation("OBS-TEXT-DRAFT", "formal", "淡铅笔底稿", "文字拼画下方存在淡铅笔底稿")];
  packet.visual_observations.overall = [observation("OBS-NO-ROAD", "overall", "道路", "画面无道路")];
  packet.hypothesis_candidates = [{ hypothesis_id: "H-TEXT-SMALL", based_on_observation_ids: ["OBS-TEXT-PERSON"], source_basis: [], provisional_hypothesis: "人物比例值得询问", alternative_explanations: ["媒介选择"] }];
  return packet;
}

function service() {
  const instance = new KnowledgeBaseService({ directory: path.resolve(__dirname, "..", "knowledge-base"), logger: { info() {}, warn() {} } });
  assert.equal(instance.load({ enabled: true }).status, "loaded");
  return instance;
}

function ids(context) { return new Set(context.matchedCardIds); }

function main() {
  const qiao = qiaoFixture();
  const qiaoFeatures = extractKnowledgeFeatures(qiao);
  const qiaoCodes = new Set(qiaoFeatures.map((item) => item.code));
  const qiaoResult = service().groundAnalysisPacket({ analysisPacket: qiao, outputType: "教师专业观察报告" });
  const qiaoIds = ids(qiaoResult.knowledgeContext);
  test("QIAO 有门不匹配无门卡", () => assert.equal(qiaoIds.has("KB-V02-199"), false));
  test("QIAO smoke uncertain 不匹配明确冒烟卡", () => assert.equal(qiaoIds.has("KB-V02-204"), false));
  test("QIAO 无根不匹配明显树根卡", () => assert.equal(qiaoIds.has("KB-V02-207"), false));
  test("QIAO 命中受限 tree scar 卡", () => assert.equal(qiaoIds.has("HTP-V01-073"), true));
  test("QIAO 命中 small person 卡", () => assert.equal(qiaoIds.has("KB-V02-212"), true));
  test("QIAO 姓名文字不产生 text_as_drawing", () => assert.equal(qiaoCodes.has("formal.text_as_drawing"), false));
  test("QIAO 五官明确缺失归一为 no", () => assert.equal(factSnapshotFromPacket(qiao).person.facialFeaturesPresent, "no"));
  test("tree scar 卡只关联 tree scar hypothesis", () => { const scar = qiaoResult.analysisPacket.hypothesis_candidates.find((item) => item.hypothesis_id === "H-SCAR"); const small = qiaoResult.analysisPacket.hypothesis_candidates.find((item) => item.hypothesis_id === "H-SMALL"); assert.ok(scar.knowledge_card_ids.includes("HTP-V01-073")); assert.equal(small.knowledge_card_ids.includes("HTP-V01-073"), false); });
  test("small person 卡只关联人物比例 hypothesis", () => { const small = qiaoResult.analysisPacket.hypothesis_candidates.find((item) => item.hypothesis_id === "H-SMALL"); assert.ok(small.knowledge_card_ids.includes("KB-V02-212")); });
  test("无门错误问题被二次事实校验拦截", () => assert.equal(qiaoResult.analysisPacket.priority_questions.some((item) => /没有门/.test(item.question)), false));

  const text = textFixture();
  const textFeatures = extractKnowledgeFeatures(text);
  const textCodes = new Set(textFeatures.map((item) => item.code));
  const textResult = service().groundAnalysisPacket({ analysisPacket: text, outputType: "教师专业观察报告" });
  const textIds = ids(textResult.knowledgeContext);
  test("TEXT 有门不匹配无门卡", () => assert.equal(textIds.has("KB-V02-199"), false));
  test("TEXT 无烟囱无烟不匹配冒烟卡", () => assert.equal(textIds.has("KB-V02-204"), false));
  test("TEXT 无根不匹配明显树根卡", () => assert.equal(textIds.has("KB-V02-207"), false));
  test("TEXT 明确无道路不产生 road.present", () => assert.equal(textCodes.has("road.present"), false));
  test("TEXT 明确文字构图产生 text_as_drawing", () => assert.equal(textCodes.has("formal.text_as_drawing"), true));
  test("TEXT 淡铅笔底稿被识别", () => assert.equal(textCodes.has("formal.under_drawing_present"), true));
  test("TEXT 独立地面线字段归一为 yes", () => assert.equal(factSnapshotFromPacket(text).groundLine.present, "yes"));

  const legacy = textFixture();
  legacy.verification_checks.roots_and_ground = { present: "no", description: "无暴露根；树干落于草字地面线", confidence: "high" };
  test("旧 present=no 只表示无根不再推出无地面线", () => { const snapshot = factSnapshotFromPacket(legacy); assert.equal(snapshot.roots.present, "no"); assert.equal(snapshot.groundLine.present, "uncertain"); });
  test("inverse feature table 严格区分互斥事实", () => { assert.equal(isInverseFeature("house.door.present", "house.door.absent"), true); assert.equal(isInverseFeature("house.smoke.uncertain", "house.smoke.present"), true); assert.equal(isInverseFeature("tree.roots.absent", "tree.roots.present"), true); });
  test("smoking card 不接受 uncertain feature", () => { const card = service().state.cards.find((item) => item.cardId === "KB-V02-204"); const uncertain = qiaoFeatures.find((item) => item.code === "house.smoke.uncertain"); assert.equal(cardMatchesFeature(card, uncertain, qiaoFeatures), false); });
}

if (require.main === module) {
  try { main(); } catch (error) { console.error("not ok - knowledge retrieval correctness"); console.error(error?.stack || error?.message || "knowledge_retrieval_test_failed"); process.exitCode = 1; }
}

module.exports = { basePacket, observation, qiaoFixture, textFixture };
