const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { normalizeKnowledgeCard } = require("../services/knowledgeCardNormalizer");
const { classifyKnowledgeUse } = require("../services/knowledgeUsePolicy");
const { extractKnowledgeFeatures } = require("../services/knowledgeFeatureExtractor");
const { KnowledgeBaseService, uniqueQuestions } = require("../services/knowledgeBaseService");
const { synchronizeKnowledgeReview } = require("../services/knowledgeReviewSyncService");

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`ok - ${passed} ${name}`);
}

function rawCard(id, overrides = {}) {
  return {
    card_id: id,
    title: id,
    feature_name: "测试特征",
    feature_codes: ["tree.scars.present"],
    card_role: "exploratory",
    claim: "仅用于探索，不构成诊断。",
    possible_hypotheses: ["可进一步了解个人意义"],
    alternative_explanations: ["绘画习惯", "装饰"],
    do_not_infer: ["trauma", "diagnosis"],
    recommended_questions: ["这些标记对你来说是什么？"],
    evidence_level: "D",
    risk_level: "medium",
    source_ids: ["SRC-1"],
    review_status: "approved",
    automation_policy: "may_support_hypothesis_after_context_and_inquiry",
    user_facing_allowed: "conditional",
    requires_inquiry_confirmation: true,
    ...overrides,
  };
}

function packet({ smoke = "uncertain", textDrawing = false } = {}) {
  const description = textDrawing
    ? "用汉字拼出房树人，多个门字强调入口，底部有淡铅笔底稿，人物很小，上部大面积留白"
    : "房屋有烟囱，两团云烟状图形，树干有三个树疤样标记，无根无地面线，小火柴人无手无五官，道路通向人物";
  return {
    visual_observations: { overall: [{ observation_id: "OBS-TREE-SCARS", object: "tree", description, visual_evidence: description, confidence: "high" }], house: [], tree: [], person: [], formal_elements: [] },
    verification_checks: {
      chimney_and_smoke: { chimney_present: "yes", smoke_present: smoke, smoke_plume_count: 2, confidence: smoke === "uncertain" ? "medium" : "high" },
      tree_trunk_width: { absolute_trunk_width: "medium", crown_to_trunk_ratio: "large", confidence: "high" },
      tree_scars_holes_damage: { present: "yes", count: 3, confidence: "high" },
      roots_and_ground: { roots_present: "no", ground_line_present: "no", confidence: "high" },
      house_openings: { door_present: textDrawing ? "yes_emphasized_by_text" : "yes", window_count: 1, confidence: "high" },
      person_hands_fingers: { hands_present: "no", confidence: "high" },
      person_facial_features: { facial_features_present: "no", confidence: "high" },
    },
    hypothesis_candidates: [{ hypothesis_id: "H1", based_on_observation_ids: ["OBS-TREE-SCARS"], provisional_hypothesis: "一种待核对的探索方向", source_basis: [], alternative_explanations: ["绘画习惯"], requires_inquiry: true }],
    priority_questions: [{ question_id: "Q1", question: "这幅画对你意味着什么？", purpose: "个人意义", related_hypothesis_ids: ["H1"] }],
  };
}

function serviceWith(cards, logger = { info() {}, warn() {} }) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "xinling-kb-"));
  fs.writeFileSync(path.join(directory, "knowledge_cards.jsonl"), `${cards.map((card) => JSON.stringify(card)).join("\n")}\n`);
  fs.writeFileSync(path.join(directory, "sources.json"), JSON.stringify([{ source_id: "SRC-1", title: "测试来源" }]));
  fs.writeFileSync(path.join(directory, "manifest.json"), JSON.stringify({ knowledgeBaseVersion: "0.2", schemaVersion: "v0.2", cardCount: cards.length, approvedCardCount: cards.filter((card) => card.review_status === "approved").length }));
  return { directory, service: new KnowledgeBaseService({ directory, logger }) };
}

function main() {
  const reviewRows = Array.from({ length: 246 }, (_, index) => ({ card_id: `KB-${index + 1}`, review_status: "approved", reviewer_decision: "approve" }));
  const cards = reviewRows.map((row, index) => rawCard(row.card_id, { claim: `专业正文-${index + 1}`, review_status: "needs_human_review" }));
  test("246 张审核结果按相同 ID 安全同步", () => assert.equal(synchronizeKnowledgeReview({ reviewRows, cards }).length, 246));
  test("同步不修改专业正文", () => assert.deepEqual(synchronizeKnowledgeReview({ reviewRows, cards }).map((card) => card.claim), cards.map((card) => card.claim)));
  test("ID 集合不一致会阻止同步", () => assert.throws(() => synchronizeKnowledgeReview({ reviewRows, cards: cards.slice(1) }), /knowledge_review_id_mismatch/));

  const mixed = serviceWith([rawCard("A"), rawCard("R", { review_status: "rejected" })]);
  test("只加载 approved", () => { mixed.service.load(); assert.equal(mixed.service.getStatus().approvedCardCount, 1); });
  test("future rejected 卡不会进入运行", () => assert.equal(mixed.service.state.cards.some((card) => card.cardId === "R"), false));

  const base = normalizeKnowledgeCard(rawCard("P"));
  test("user_facing=false 不进入心灵对话", () => assert.equal(classifyKnowledgeUse({ ...base, userFacingAllowed: false }, "心灵对话", { confidence: "high" }).allowed, false));
  test("conditional 按允许策略保持探索性", () => assert.equal(classifyKnowledgeUse(base, "心灵对话", { confidence: "high" }).tentative, true));
  test("人工审核限制策略不可自动输出", () => assert.equal(classifyKnowledgeUse({ ...base, automationPolicy: "do_not_surface_without_human_review" }, "心灵对话", { confidence: "high" }).allowed, false));
  test("system_rule_only 仅进入 guardrail", () => assert.equal(classifyKnowledgeUse({ ...base, cardRole: "system_guardrail", automationPolicy: "system_rule_only" }, "教师专业观察报告", { confidence: "high" }).use, "guardrail"));
  test("中性问题策略进入 interview", () => assert.equal(classifyKnowledgeUse({ ...base, cardRole: "interview_guidance", automationPolicy: "may_generate_nonleading_question" }, "后续访谈问题", { confidence: "high" }).use, "interview"));
  test("low confidence 不支持心理假设", () => assert.equal(classifyKnowledgeUse(base, "教师专业观察报告", { confidence: "low" }).allowed, false));
  test("smoke uncertain 只允许澄清类用途", () => assert.equal(classifyKnowledgeUse(base, "教师专业观察报告", { confidence: "medium", uncertain: true }).allowed, false));
  test("树疤可检索但仍不确认 trauma", () => { const result = serviceWith([rawCard("SCAR")]).service.groundAnalysisPacket({ analysisPacket: packet(), outputType: "教师专业观察报告" }); assert.equal(result.analysisPacket.hypothesis_candidates[0].knowledge_grounding.hypothesis_status, "unverified"); assert.ok(result.analysisPacket.hypothesis_candidates[0].knowledge_grounding.do_not_infer.includes("trauma")); });
  test("D/E 证据只能保持限制或部分支持", () => { const result = serviceWith([rawCard("D")]).service.groundAnalysisPacket({ analysisPacket: packet(), outputType: "教师专业观察报告" }); assert.ok(["restricted", "partial_support"].includes(result.analysisPacket.hypothesis_candidates[0].knowledge_grounding.status)); });
  test("do_not_infer 优先进入限制结果", () => { const result = serviceWith([rawCard("X")]).service.groundAnalysisPacket({ analysisPacket: packet(), outputType: "教师专业观察报告" }); assert.equal(result.analysisPacket.hypothesis_candidates[0].knowledge_grounding.user_facing_allowed, false); });
  test("无匹配卡保留 model_general_knowledge", () => { const result = serviceWith([rawCard("OTHER", { feature_codes: ["house.window.absent"] })]).service.groundAnalysisPacket({ analysisPacket: packet(), outputType: "教师专业观察报告" }); assert.ok(result.analysisPacket.hypothesis_candidates[0].source_basis.includes("model_general_knowledge")); });
  test("无匹配时不伪造 card ID", () => { const result = serviceWith([rawCard("OTHER", { feature_codes: ["house.window.absent"] })]).service.groundAnalysisPacket({ analysisPacket: packet() }); assert.deepEqual(result.analysisPacket.hypothesis_candidates[0].knowledge_card_ids, []); });
  test("知识卡数量上限生效", () => { const many = Array.from({ length: 20 }, (_, index) => rawCard(`M${index}`)); const result = serviceWith(many).service.retrieve({ analysisPacket: packet(), outputType: "教师专业观察报告", limits: { hypothesis: 3 } }); assert.equal(result.hypothesisCards.length, 3); });
  test("优先问题去重并限制 8 个", () => assert.equal(uniqueQuestions(Array.from({ length: 12 }, (_, index) => ({ question: `问题${index % 9}` }))).length, 8));
  test("家校沟通排除探索性创伤假设", () => assert.equal(classifyKnowledgeUse(base, "家校沟通建议", { confidence: "high" }).allowed, false));
  test("风险提示不由单一符号触发自杀判断", () => assert.equal(classifyKnowledgeUse(base, "风险提示与转介建议", { confidence: "high" }).allowed, false));
  test("辅导记录不注入未经确认陈述", () => { const original = packet(); const result = serviceWith([rawCard("REC")]).service.groundAnalysisPacket({ analysisPacket: original, outputType: "辅导记录初稿" }); assert.equal(result.analysisPacket.hypothesis_candidates[0].provisional_hypothesis, original.hypothesis_candidates[0].provisional_hypothesis); });
  test("关闭知识库回退模型通识模式", () => { const result = serviceWith([rawCard("OFF")]).service.groundAnalysisPacket({ analysisPacket: packet(), enabled: false }); assert.equal(result.analysisPacket.hypothesis_candidates[0].knowledge_grounding.status, "no_approved_match"); });
  test("损坏文件安全 load_failed", () => { const fixture = serviceWith([rawCard("BAD")]); fs.writeFileSync(path.join(fixture.directory, "knowledge_cards.jsonl"), "{bad\n"); assert.equal(fixture.service.load().status, "load_failed"); });
  test("日志不包含知识卡正文", () => { const logs = []; const fixture = serviceWith([rawCard("LOG", { claim: "SENSITIVE_KNOWLEDGE_CLAIM" })], { info: (value) => logs.push(value), warn: (value) => logs.push(value) }); fixture.service.retrieve({ analysisPacket: packet() }); assert.doesNotMatch(logs.join("\n"), /SENSITIVE_KNOWLEDGE_CLAIM/); });
  test("CASE-QIAO 特征检索包含关键事实", () => { const codes = extractKnowledgeFeatures(packet()).map((item) => item.code); for (const code of ["house.smoke.uncertain", "tree.trunk.width.medium", "tree.scars.multiple", "tree.roots.absent", "person.form.stick", "road.present"]) assert.ok(codes.includes(code), code); });
  test("CASE-TEXT 特殊文字拼画不自动病理化", () => { const codes = extractKnowledgeFeatures(packet({ textDrawing: true })).map((item) => item.code); assert.ok(codes.includes("formal.text_as_drawing")); assert.ok(codes.includes("formal.under_drawing_present")); assert.ok(codes.includes("house.door.emphasized")); assert.equal(codes.some((code) => /diagnosis|pathology|intelligence/.test(code)), false); });

  const runtimeService = new KnowledgeBaseService({ directory: path.resolve(__dirname, "..", "knowledge-base"), logger: { info() {}, warn() {} } });
  const runtimeStatus = runtimeService.load({ enabled: true });
  const runtimeById = new Map(runtimeService.state.cards.map((card) => [card.cardId, card]));
  test("真实 V0.2 runtime 加载 246 张 approved", () => { assert.equal(runtimeStatus.status, "loaded"); assert.equal(runtimeStatus.approvedCardCount, 246); });
  test("真实 runtime 可加载 KB-V02-166", () => assert.ok(runtimeById.has("KB-V02-166")));
  test("真实 runtime 可加载 KB-V02-246", () => assert.ok(runtimeById.has("KB-V02-246")));
  test("真实 runtime 保留 HTP-V01-001", () => assert.ok(runtimeById.has("HTP-V01-001")));
  test("真实受限 approved 卡仍被 automation policy 拦截", () => { const restricted = runtimeService.state.cards.find((card) => card.automationPolicy === "do_not_surface_without_human_review"); assert.ok(restricted); assert.equal(classifyKnowledgeUse(restricted, "心灵对话", { confidence: "high" }).allowed, false); });
  test("真实 user_facing=false 卡不进入学生心灵对话", () => { const card = runtimeService.state.cards.find((item) => item.userFacingAllowed === false && item.automationPolicy !== "system_rule_only"); assert.ok(card); assert.equal(classifyKnowledgeUse(card, "心灵对话", { confidence: "high" }).allowed, false); });
  test("真实 D/E 探索卡保持 tentative", () => { const card = runtimeService.state.cards.find((item) => ["D", "E"].includes(item.evidenceLevel) && item.cardRole === "exploratory_hypothesis" && item.automationPolicy === "may_support_hypothesis_after_context_and_inquiry"); assert.ok(card); assert.equal(classifyKnowledgeUse(card, "教师专业观察报告", { confidence: "high" }).tentative, true); });
  test("真实 system_guardrail 正确加载", () => assert.equal(runtimeService.state.cards.filter((card) => card.cardRole === "system_guardrail").length, 18));
  test("真实 do_not_infer 优先限制自动呈现", () => { const card = runtimeService.state.cards.find((item) => item.doNotInfer.length && item.cardRole === "exploratory_hypothesis"); assert.ok(card); const grounded = serviceWith([rawCard("REAL-POLICY", { do_not_infer: card.doNotInfer })]).service.groundAnalysisPacket({ analysisPacket: packet(), outputType: "心灵对话" }); assert.equal(grounded.analysisPacket.hypothesis_candidates[0].knowledge_grounding.user_facing_allowed, false); });
  assert.ok(passed >= 26);
}

try { main(); } catch (error) { console.error("not ok - knowledge base offline tests"); console.error(error?.stack || error?.message || "knowledge_test_failed"); process.exitCode = 1; }
