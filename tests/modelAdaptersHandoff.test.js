const assert = require("node:assert/strict");
const { generateTeacherReport } = require("../model-adapters");

function v2Package() {
  const obs = {
    observation_id: "OBS-TREE-003",
    object: "tree",
    feature: "三个树疤样结构",
    description: "树干上可见三个大型疤痕样结构",
    visual_evidence: "三个轮廓清晰且重复的椭圆形结构",
    confidence: "high",
    psychological_salience: "high",
  };
  return {
    prompt_version: "HTP_VISUAL_HYPOTHESIS_V2",
    image_quality: { rating: "good", limitations: [], needs_retake: false },
    visual_observations: { overall: [], house: [], tree: [obs], person: [], formal_elements: [] },
    verification_checks: {
      tree_trunk_width: { absolute_judgment: "thick", base_width: "宽", middle_width: "宽", relation_to_tree_height: "较宽", relation_to_crown: "树冠很大", possible_crown_size_bias: true, confidence: "high", evidence: "树干宽度清晰" },
      tree_scars_holes_damage: { present: "yes", count: 3, locations: ["树干"], description: "三个疤痕样结构", confidence: "high" },
      broken_or_dead_branches: {}, roots_and_ground: {}, house_openings: {}, person_hands_fingers: {}, person_facial_features: {}, erasures_retracing: {}, shading_blackening: {}, repeated_unusual_symbols: {}, edge_proximity: {}, other_possible_omissions: [],
    },
    salient_features: [{ ...obs, needs_human_visual_confirmation: false }],
    hypothesis_candidates: [{
      hypothesis_id: "H1",
      theme: "受伤与恢复",
      based_on_observation_ids: ["OBS-TREE-003"],
      knowledge_card_ids: [],
      source_basis: ["model_general_knowledge"],
      provisional_hypothesis: "可能值得了解受伤与恢复主题",
      why_worth_exploring: "重复且显著",
      alternative_explanations: ["装饰", "临摹"],
      supporting_information_needed: ["创作者说明"],
      disconfirming_information: ["仅为装饰设计"],
      requires_inquiry: true,
      user_facing_allowed: false,
      sensitivity: "high",
    }],
    strengths_and_resources: ["树仍有完整树冠"],
    priority_questions: [{ question: "这些痕迹是什么？", purpose: "了解个人意义", related_hypothesis_ids: ["H1"] }],
    safety: { safety_followup_needed: true, reason: "建议人工直接核查", do_not_infer: ["不得推断概率"] },
    handoff_summary: "待验证资料包",
  };
}

async function main() {
  const originalFetch = global.fetch;
  const oldQwenKey = process.env.QWEN_API_KEY;
  const oldDeepSeekKey = process.env.DEEPSEEK_API_KEY;
  process.env.QWEN_API_KEY = "offline-qwen-key";
  process.env.DEEPSEEK_API_KEY = "offline-deepseek-key";
  let deepSeekRequest;
  try {
    global.fetch = async (url, options) => {
      const body = JSON.parse(options.body);
      if (String(url).includes("qwen.invalid")) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(v2Package()) } }] }),
        };
      }
      deepSeekRequest = body;
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ choices: [{ message: { content: "# 测试报告\n\n可能存在值得进一步了解的线索。" } }] }),
      };
    };

    const modelConfig = {
      pipelineMode: "split",
      singleProvider: "openai",
      singleModel: "gpt-4o-mini",
      visionProvider: "qwen",
      visionModel: "qwen-test",
      textProvider: "deepseek",
      textModel: "deepseek-test",
    };
    const modelRuntimeConfig = {
      modelConfig,
      vision: { provider: "qwen", model: "qwen-test", baseUrl: "https://qwen.invalid/v1", requestUrl: "https://qwen.invalid/v1/chat/completions", baseUrlHost: "qwen.invalid", settingsSource: "sqlite", baseUrlSource: "app.env" },
      text: { provider: "deepseek", model: "deepseek-test", baseUrl: "https://deepseek.invalid", requestUrl: "https://deepseek.invalid/chat/completions", baseUrlHost: "deepseek.invalid", settingsSource: "sqlite", baseUrlSource: "app.env" },
    };
    const result = await generateTeacherReport({
      image: "data:image/png;base64,AA==",
      profile: { contentType: "professional", studentAlias: "离线测试" },
      modelConfig,
      modelRuntimeConfig,
    });

    const userText = deepSeekRequest.messages[1].content;
    const systemText = deepSeekRequest.messages[0].content;
    assert.doesNotMatch(userText, /data:image|;base64,/i);
    assert.match(userText, /alternative_explanations/);
    assert.match(userText, /disconfirming_information/);
    assert.match(userText, /strengths_and_resources/);
    assert.match(userText, /safety_followup_needed/);
    assert.match(systemText, /不是事实/);
    assert.match(systemText, /low 不得成为心理解释依据/);
    assert.match(systemText, /不得假装已经完成访谈验证/);
    assert.match(result.observationRecord, /OBS-TREE-003/);
    console.log("ok - 完整 V2 资料包以纯文本交接 DeepSeek，未携带图片输入");
  } finally {
    global.fetch = originalFetch;
    if (oldQwenKey === undefined) delete process.env.QWEN_API_KEY;
    else process.env.QWEN_API_KEY = oldQwenKey;
    if (oldDeepSeekKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = oldDeepSeekKey;
  }
}

main().catch((error) => {
  console.error("not ok - model adapter V2 handoff test");
  console.error(error?.message || "offline_test_failed");
  process.exitCode = 1;
});
