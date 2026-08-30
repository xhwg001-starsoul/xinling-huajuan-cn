const assert = require("node:assert/strict");
const { createMultimodalProviderRegistry } = require("../services/multimodalProviderRegistry");
const { standardizeMultimodalResult } = require("../services/multimodalAnalysisResult");
const { generateAnalysisWithModelRouter } = require("../services/modelRouter");
const { analysisTimeoutMs, CONNECTION_TEST_IMAGE } = require("../services/providers/multimodal/common");
const { imageInputMetadata, visualFactSummary } = require("../services/imageInputMetadata");

function observation(id, confidence = "high", feature = "树干") {
  return { observation_id: id, object: "tree", feature, description: feature, visual_evidence: feature, confidence, psychological_salience: "high" };
}

function packet() {
  const obs = observation("OBS-TREE-001");
  return {
    prompt_version: "HTP_VISUAL_HYPOTHESIS_V2",
    image_quality: { rating: "good", limitations: [], needs_retake: false },
    visual_observations: { overall: [], house: [], tree: [obs], person: [], formal_elements: [] },
    verification_checks: {
      tree_trunk_width: { absolute_judgment: "thick", absolute_trunk_width: "thick", crown_to_trunk_ratio: "large", base_width: "宽", middle_width: "宽", relation_to_tree_height: "较宽", relation_to_crown: "树冠很大", possible_crown_size_bias: true, confidence: "high", evidence: "树干宽" },
      chimney_and_smoke: { chimney_present: "yes", smoke_present: "yes", smoke_plume_count: 2, confidence: "high", evidence: "两团烟" },
      tree_scars_holes_damage: { present: "yes", count: 3, locations: ["树干"], description: "三个树疤样结构", confidence: "high" },
      broken_or_dead_branches: {}, roots_and_ground: { present: "no" }, house_openings: { window_present: "yes" }, person_hands_fingers: {}, person_facial_features: {}, erasures_retracing: {}, shading_blackening: {}, repeated_unusual_symbols: {}, edge_proximity: {}, other_possible_omissions: [],
    },
    salient_features: [{ ...obs, needs_human_visual_confirmation: false }],
    hypothesis_candidates: [{
      hypothesis_id: "H1", theme: "成长", based_on_observation_ids: ["OBS-TREE-001"], knowledge_card_ids: [], source_basis: ["model_general_knowledge"], provisional_hypothesis: "待核对", why_worth_exploring: "线索清晰", alternative_explanations: ["绘画习惯"], supporting_information_needed: ["创作者说明"], disconfirming_information: ["临摹"], requires_inquiry: true, user_facing_allowed: false, sensitivity: "medium",
    }],
    strengths_and_resources: ["持续生长"],
    priority_questions: [{ question_id: "Q1", question: "这棵树是什么状态？", purpose: "了解个人意义", related_hypothesis_ids: ["H1"] }],
    safety: { safety_followup_needed: false, reason: "", do_not_infer: [] },
    handoff_summary: "待验证资料包",
  };
}

function fullResponse(reportMarkdown = "# 测试报告\n\n图中烟囱有两团烟，树干中等偏粗，树冠相对较大。树干有三个树疤样结构，但不能据此确定具体经历。") {
  return JSON.stringify({ promptVersion: "HTP_MULTIMODAL_FULL_V1", analysisPacket: packet(), reportMarkdown });
}

function stage(provider, model) {
  return { provider, model, baseUrl: `https://${provider}.invalid/v1`, requestUrl: `https://${provider}.invalid/v1/${provider === "openai" ? "responses" : "chat/completions"}`, baseUrlHost: `${provider}.invalid`, settingsSource: "sqlite", baseUrlSource: "app.env" };
}

function runtime(provider, model) {
  const multimodal = stage(provider, model);
  const modelConfig = { analysisMode: "single_multimodal", multimodalProvider: provider, multimodalModel: model, allowTeacherModelSelection: false, pipelineMode: "single", singleProvider: "openai", singleModel: "gpt-4o-mini", visionProvider: "qwen", visionModel: "qwen-old", textProvider: "deepseek", textModel: "deepseek-old" };
  return { analysisMode: "single_multimodal", modelConfig, multimodal, single: multimodal, vision: multimodal, text: multimodal, settingsSource: "sqlite" };
}

async function main() {
  const oldKeys = { OPENAI_API_KEY: process.env.OPENAI_API_KEY, QWEN_API_KEY: process.env.QWEN_API_KEY, DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY };
  process.env.OPENAI_API_KEY = "offline-openai-key";
  process.env.QWEN_API_KEY = "offline-qwen-key";
  process.env.DEEPSEEK_API_KEY = "offline-deepseek-key";
  try {
    assert.equal(analysisTimeoutMs(undefined), 240000);
    assert.equal(analysisTimeoutMs(1000), 30000);
    assert.equal(analysisTimeoutMs(900000), 600000);
    assert.deepEqual(imageInputMetadata(CONNECTION_TEST_IMAGE), { mimeType: "image/png", width: 64, height: 64, bytes: 455 });
    const facts = visualFactSummary(packet());
    assert.equal(facts.smokeCloudDecision.smoke_present, "yes");
    assert.equal(facts.absoluteTrunkWidth, "thick");
    assert.equal(facts.crownToTrunkRatio, "large");
    assert.equal(facts.scarCount, 3);
    const requests = [];
    const fetchImpl = async (url, options) => {
      const body = JSON.parse(options.body);
      requests.push({ url, body });
      const content = fullResponse();
      return url.includes("openai.invalid")
        ? { ok: true, status: 200, json: async () => ({ status: "completed", output_text: content, usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 } }) }
        : { ok: true, status: 200, json: async () => ({ choices: [{ finish_reason: "stop", message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 } }) };
    };
    const registry = createMultimodalProviderRegistry({ fetchImpl });
    assert.deepEqual(registry.list(), ["openai", "qwen", "deepseek"]);
    console.log("ok - 1 provider registry 加载三个 Provider");

    for (const [provider, model] of [["qwen", "qwen3.8-max"], ["deepseek", "deepseek-v4-flash-vision-exp"], ["openai", "configured-openai-model"]]) {
      requests.length = 0;
      const result = await generateAnalysisWithModelRouter({ images: ["data:image/png;base64,AA=="], userInputs: { contentType: "professional" }, modelRuntimeConfig: runtime(provider, model), providerRegistry: registry });
      assert.equal(requests.length, 1);
      assert.equal(requests[0].body.model, model);
      assert.match(JSON.stringify(requests[0].body), /data:image\/png;base64,AA==/);
      assert.equal(result.provider, provider);
      assert.equal(result.mode, "single_multimodal");
    }
    console.log("ok - 2/3/4 三个单模型 Provider 各只接收原图并调用一次");

    let fallbackCalls = 0;
    const failingRegistry = { get: () => ({ analyzeDrawing: async () => { fallbackCalls += 1; throw new Error("qwen_request_failed"); } }) };
    await assert.rejects(() => generateAnalysisWithModelRouter({ images: ["data:image/png;base64,AA=="], modelRuntimeConfig: runtime("qwen", "qwen3.8-max"), providerRegistry: failingRegistry }), /qwen_request_failed/);
    assert.equal(fallbackCalls, 1);
    console.log("ok - 5/6 旧链保留，单模型失败不跨 Provider 回退");

    assert.throws(() => standardizeMultimodalResult({ rawText: fullResponse("# 报告\n\n烟囱没有烟。"), provider: "qwen", model: "qwen3.8-max" }), /report_fact_conflict/);
    assert.throws(() => standardizeMultimodalResult({ rawText: fullResponse("# 报告\n\n树干细长。"), provider: "qwen", model: "qwen3.8-max" }), /report_fact_conflict/);
    console.log("ok - 7/8 烟雾与树干硬事实冲突被拦截");

    const normalized = standardizeMultimodalResult({ rawText: fullResponse(), provider: "qwen", model: "qwen3.8-max" });
    assert.equal(normalized.analysisPacket.verification_checks.tree_scars_holes_damage.count, 3);
    assert.doesNotMatch(normalized.reportMarkdown, /确定.*心理创伤|确诊创伤/);
    assert.equal(normalized.analysisPacket.hypothesis_candidates[0].alternative_explanations[0], "绘画习惯");
    assert.equal(normalized.analysisPacket.priority_questions[0].question_id, "Q1");
    console.log("ok - 9/11 树疤边界与 Inquiry 结构完整保留");

    const low = packet();
    low.visual_observations.tree[0].confidence = "low";
    low.salient_features[0].confidence = "low";
    low.hypothesis_candidates[0].based_on_observation_ids = ["OBS-TREE-001"];
    const lowResult = standardizeMultimodalResult({ rawText: JSON.stringify({ analysisPacket: low, reportMarkdown: "# 报告\n\n需人工确认。" }), provider: "qwen", model: "qwen3.8-max" });
    assert.equal(lowResult.analysisPacket.hypothesis_candidates.length, 0);
    console.log("ok - 10 low confidence 不形成确定心理假设");

    const loose = packet();
    loose.visual_observations.overall = ["画面主体位于纸张中央"];
    loose.priority_questions[0] = { question: "这幅画对你意味着什么？" };
    const looseResult = standardizeMultimodalResult({ rawText: JSON.stringify({ analysisPacket: loose, reportMarkdown: "# 报告\n\n结构化内容需结合人工核对。" }), provider: "deepseek", model: "deepseek-vision-test" });
    assert.equal(looseResult.analysisPacket.visual_observations.overall[0].confidence, "low");
    assert.equal(looseResult.analysisPacket.priority_questions[0].question_id, "Q1");
    console.log("ok - 非严格观察条目被保守标准化，不误增置信度");

    const logs = [];
    const originalInfo = console.info;
    console.info = (value) => logs.push(String(value));
    try {
      await generateAnalysisWithModelRouter({ images: ["data:image/png;base64,SENSITIVEIMAGE"], userInputs: { teacherConcern: "SENSITIVEBACKGROUND" }, modelRuntimeConfig: runtime("qwen", "qwen3.8-max"), providerRegistry: { get: () => ({ analyzeDrawing: async () => ({ ...normalized, diagnostics: { requestId: "safe", finishReason: "stop", truncated: false } }) }) } });
    } finally {
      console.info = originalInfo;
    }
    assert.doesNotMatch(logs.join("\n"), /offline-qwen-key|SENSITIVEIMAGE|SENSITIVEBACKGROUND|测试报告/);
    console.log("ok - 12 模型追踪日志不含密钥、图片、背景或报告正文");
  } finally {
    for (const [key, value] of Object.entries(oldKeys)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}

main().catch((error) => {
  console.error("not ok - multimodal architecture offline tests");
  console.error(error?.message || "offline_test_failed");
  process.exitCode = 1;
});
