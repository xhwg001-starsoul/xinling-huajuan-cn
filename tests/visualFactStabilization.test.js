const assert = require("node:assert/strict");
const { buildFactSnapshot } = require("../services/visualFactSnapshot");
const { evaluateReportFactConsistency } = require("../services/analysisConsistencyService");
const { buildSafeAnalysisDiagnostics } = require("../services/imageInputMetadata");
const { CONNECTION_TEST_IMAGE } = require("../services/providers/multimodal/common");

function packet() {
  return {
    visual_observations: {
      overall: [{ observation_id: "O1", feature: "云烟形态", description: "烟或云的语义暂不确定", visual_evidence: "烟囱上方有两团轮廓", confidence: "medium" }],
      house: [], tree: [], person: [], formal_elements: [],
    },
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
}

function run(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

const snapshot = buildFactSnapshot(packet());

run("1 smoke uncertain 不得改写为明确无烟", () => {
  assert.equal(evaluateReportFactConsistency(snapshot, "烟囱没有烟。 ").status, "conflict");
});

run("2 smoke uncertain 不得改写为明确冒烟", () => {
  assert.equal(evaluateReportFactConsistency(snapshot, "烟囱正在冒烟。 ").status, "conflict");
});

run("3 smoke uncertain 允许保留性描述", () => {
  assert.equal(evaluateReportFactConsistency(snapshot, "烟囱上方形态可能是烟，也可能是云，需要创作者确认。 ").status, "pass");
});

run("4 medium 绝对树干宽度不得改写为很细", () => {
  assert.equal(evaluateReportFactConsistency(snapshot, "树干很细。 ").status, "conflict");
});

run("5 树冠树干相对比例不会偷换绝对树干宽度", () => {
  assert.equal(evaluateReportFactConsistency(snapshot, "树冠相对树干比例偏大，树干绝对宽度中等。 ").status, "pass");
});

run("6 否定表达不会误判为细弱树干", () => {
  assert.equal(evaluateReportFactConsistency(snapshot, "不能把它误判成细弱树干，树干并不细弱。 ").status, "pass");
});

run("7 thick 树干不得改写为细长", () => {
  const thick = structuredClone(snapshot);
  thick.treeTrunk.absoluteWidth = "thick";
  assert.equal(evaluateReportFactConsistency(thick, "树干细长。 ").status, "conflict");
});

run("8 三个树疤不得被改写为无标记", () => {
  assert.equal(evaluateReportFactConsistency(snapshot, "树干没有明显标记。 ").status, "conflict");
});

run("9 不提树疤不构成冲突", () => {
  assert.equal(evaluateReportFactConsistency(snapshot, "画面呈现房、树、人三个主体。 ").status, "pass");
});

run("10 未见树根不得改写为根系明显", () => {
  assert.equal(evaluateReportFactConsistency(snapshot, "根系明显。 ").status, "conflict");
});

run("11 一个窗户不得改写为没有窗户", () => {
  assert.equal(evaluateReportFactConsistency(snapshot, "房屋没有窗户。 ").status, "conflict");
});

run("12 有门不得改写为无门", () => {
  assert.equal(evaluateReportFactConsistency(snapshot, "房屋无门。 ").status, "conflict");
});

run("13 low confidence 不作强制事实冲突", () => {
  const low = structuredClone(snapshot);
  low.smoke.confidence = "low";
  low.treeTrunk.confidence = "low";
  assert.equal(evaluateReportFactConsistency(low, "烟囱正在冒烟，树干很细。 ").status, "pass");
});

run("14 管理员诊断 DTO 不含图片正文和敏感字段", () => {
  const diagnostics = buildSafeAnalysisDiagnostics({
    analysisResult: { mode: "single_multimodal", provider: "qwen", model: "qwen-test", promptVersion: "V2", analysisPacket: packet(), factSnapshot: snapshot, diagnostics: { factConsistency: { status: "pass", conflicts: [] } } },
    imageDataUrl: CONNECTION_TEST_IMAGE,
  });
  const serialized = JSON.stringify(diagnostics);
  assert.doesNotMatch(serialized, /data:image|base64|api[_-]?key|session[_-]?token|reportMarkdown|studentBackground/i);
  assert.equal(Object.hasOwn(diagnostics, "analysisPacket"), false);
});

run("15 原图和模型输入元数据分别记录且明确无预处理", () => {
  const diagnostics = buildSafeAnalysisDiagnostics({ analysisResult: { analysisPacket: packet(), factSnapshot: snapshot }, imageDataUrl: CONNECTION_TEST_IMAGE });
  assert.deepEqual(diagnostics.inputImage.original, { width: 64, height: 64, mimeType: "image/png", byteLength: 455 });
  assert.deepEqual(diagnostics.inputImage.sentToModel, diagnostics.inputImage.original);
  assert.deepEqual(diagnostics.inputImage.preprocessOperations, []);
  assert.equal(diagnostics.criticalVisualFacts.smoke.present, "uncertain");
  assert.equal(diagnostics.criticalVisualFacts.treeTrunk.absoluteWidth, "medium");
  assert.equal(diagnostics.criticalVisualFacts.treeTrunk.crownToTrunkRatio, "large");
  assert.equal(diagnostics.criticalVisualFacts.treeScars.count, 3);
});

run("16 缺失诊断状态时执行真实一致性检查并返回 pass", () => {
  const diagnostics = buildSafeAnalysisDiagnostics({
    analysisResult: { analysisPacket: packet(), factSnapshot: snapshot, reportMarkdown: "烟囱上方有两个云烟状轮廓，可能是云也可能是烟。" },
    imageDataUrl: CONNECTION_TEST_IMAGE,
  });
  assert.deepEqual(diagnostics.factConsistency, { status: "pass", conflicts: [] });
});

run("17 明确事实冲突保留 conflict 状态和 report_fact_conflict", () => {
  const { assertReportFactConsistency } = require("../services/analysisConsistencyService");
  assert.throws(
    () => assertReportFactConsistency(packet(), "烟囱没有烟。"),
    (error) => error.message === "report_fact_conflict" && error.factConsistency?.status === "conflict" && error.factConsistency.conflicts.length > 0,
  );
});
