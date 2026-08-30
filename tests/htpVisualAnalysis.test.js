const assert = require("node:assert/strict");
const {
  approvedKnowledgeContext,
  normalizeV1Observation,
  parseJsonObject,
  sanitizeV2AnalysisPackage,
} = require("../services/htpVisualAnalysis");

function observation(id, confidence = "high", feature = "测试特征") {
  return {
    observation_id: id,
    object: "tree",
    feature,
    description: `${feature}的客观描述`,
    visual_evidence: `${feature}的可见证据`,
    confidence,
    psychological_salience: "high",
  };
}

function basePackage() {
  return {
    prompt_version: "HTP_VISUAL_HYPOTHESIS_V2",
    image_quality: { rating: "good", limitations: [], needs_retake: false },
    visual_observations: {
      overall: [],
      house: [],
      tree: [observation("OBS-TREE-001")],
      person: [],
      formal_elements: [],
    },
    verification_checks: {
      tree_trunk_width: {
        absolute_judgment: "thick",
        base_width: "底部较宽",
        middle_width: "中段较宽",
        relation_to_tree_height: "比例较宽",
        relation_to_crown: "树冠巨大造成相对视觉偏差",
        possible_crown_size_bias: true,
        confidence: "high",
        evidence: "树干底部和中段均有明确宽度",
      },
      tree_scars_holes_damage: {
        present: "no",
        count: 0,
        locations: [],
        description: "未见明确痕迹",
        confidence: "high",
      },
      broken_or_dead_branches: {},
      roots_and_ground: {},
      house_openings: {},
      person_hands_fingers: {},
      person_facial_features: {},
      erasures_retracing: {},
      shading_blackening: {},
      repeated_unusual_symbols: {},
      edge_proximity: {},
      other_possible_omissions: [],
    },
    salient_features: [{
      ...observation("OBS-TREE-001"),
      needs_human_visual_confirmation: false,
    }],
    hypothesis_candidates: [{
      hypothesis_id: "H1",
      theme: "成长与恢复",
      based_on_observation_ids: ["OBS-TREE-001"],
      knowledge_card_ids: ["FAKE-CARD"],
      source_basis: ["model_general_knowledge"],
      provisional_hypothesis: "这是需要通过 Inquiry 核对的工作假设",
      why_worth_exploring: "特征清晰且显著",
      alternative_explanations: ["绘画习惯", "构图需要"],
      supporting_information_needed: ["创作者对树的说明"],
      disconfirming_information: ["创作者说明该细节仅是临摹"],
      requires_inquiry: true,
      user_facing_allowed: false,
      sensitivity: "medium",
    }],
    strengths_and_resources: ["画面呈现持续生长的元素"],
    priority_questions: [{
      question: "这棵树现在是什么状态？",
      purpose: "了解创作者赋予树的个人意义",
      related_hypothesis_ids: ["H1"],
    }],
    safety: { safety_followup_needed: false, reason: "", do_not_infer: [] },
    handoff_summary: "完整资料包仅供后续模型形成待验证理解。",
  };
}

function run(name, test) {
  try {
    test();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

run("A: 大树冠不会把明确粗树干改成细树干", () => {
  const result = sanitizeV2AnalysisPackage(basePackage());
  assert.equal(result.verification_checks.tree_trunk_width.absolute_judgment, "thick");
  assert.equal(result.verification_checks.tree_trunk_width.possible_crown_size_bias, true);
  assert.doesNotMatch(JSON.stringify(result.verification_checks.tree_trunk_width), /"absolute_judgment":"thin"/);
});

run("B: 三个树疤保留为高显著线索但不是创伤结论", () => {
  const input = basePackage();
  input.visual_observations.tree.push(observation("OBS-TREE-003", "high", "三个树疤样结构"));
  input.verification_checks.tree_scars_holes_damage = {
    present: "yes",
    count: 3,
    locations: ["树干下部", "树干中部", "树干中上部"],
    description: "三个明显的大型疤痕样结构",
    confidence: "high",
  };
  input.salient_features.push({
    ...observation("OBS-TREE-003", "high", "三个树疤样结构"),
    needs_human_visual_confirmation: false,
  });
  input.hypothesis_candidates[0].based_on_observation_ids = ["OBS-TREE-003"];
  input.hypothesis_candidates[0].provisional_hypothesis = "可能值得了解受伤与恢复主题，必须通过 Inquiry 验证";
  const result = sanitizeV2AnalysisPackage(input);
  assert.equal(result.verification_checks.tree_scars_holes_damage.count, 3);
  assert(result.salient_features.some((item) => item.observation_id === "OBS-TREE-003"));
  assert(result.hypothesis_candidates.some((item) => item.based_on_observation_ids.includes("OBS-TREE-003")));
  assert.doesNotMatch(JSON.stringify(result), /存在心理创伤|确诊创伤/);
});

run("C: low confidence 不能成为候选假设依据", () => {
  const input = basePackage();
  input.visual_observations.tree = [observation("OBS-LOW-001", "low", "疑似树洞")];
  input.salient_features = [{
    ...observation("OBS-LOW-001", "low", "疑似树洞"),
    needs_human_visual_confirmation: true,
  }];
  input.hypothesis_candidates[0].based_on_observation_ids = ["OBS-LOW-001"];
  const result = sanitizeV2AnalysisPackage(input);
  assert.equal(result.hypothesis_candidates.length, 0);
  assert.equal(result.salient_features[0].needs_human_visual_confirmation, true);
});

run("D: 替代解释和证伪信息完整交接", () => {
  const result = sanitizeV2AnalysisPackage(basePackage());
  assert.deepEqual(result.hypothesis_candidates[0].alternative_explanations, ["绘画习惯", "构图需要"]);
  assert.deepEqual(result.hypothesis_candidates[0].disconfirming_information, ["创作者说明该细节仅是临摹"]);
  assert.deepEqual(result.hypothesis_candidates[0].supporting_information_needed, ["创作者对树的说明"]);
  assert.deepEqual(result.hypothesis_candidates[0].knowledge_card_ids, []);
});

run("E: V1 兼容封装不丢失已有心理资源", () => {
  const result = normalizeV1Observation({
    house: {}, tree: {}, person: {}, strengths_and_resources: ["坚持完成画作"],
  });
  assert.deepEqual(result.strengths_and_resources, ["坚持完成画作"]);
  assert.equal(result.prompt_version, "HTP_VISUAL_V1");
});

run("F: 安全标记只保留人工核查所需字段，不产生分数或诊断", () => {
  const input = basePackage();
  input.safety = {
    safety_followup_needed: true,
    reason: "建议由受过训练的人员进行直接安全询问",
    do_not_infer: ["不得推断自杀概率", "不得作诊断"],
    risk_score: 92,
    diagnosis: "不应保留",
  };
  const result = sanitizeV2AnalysisPackage(input);
  assert.equal(result.safety.safety_followup_needed, true);
  assert.match(result.safety.reason, /直接安全询问/);
  assert.equal(Object.hasOwn(result.safety, "risk_score"), false);
  assert.equal(Object.hasOwn(result.safety, "diagnosis"), false);
});

run("解析器兼容 Markdown 围栏和尾随逗号", () => {
  const parsed = parseJsonObject('```json\n{"ok":true,}\n```');
  assert.deepEqual(parsed, { ok: true });
});

run("知识库上下文只接受 approved 卡", () => {
  const cards = approvedKnowledgeContext([
    { id: "A", review_status: "approved" },
    { id: "B", review_status: "needs_human_review" },
  ]);
  assert.deepEqual(cards.map((card) => card.id), ["A"]);
});
