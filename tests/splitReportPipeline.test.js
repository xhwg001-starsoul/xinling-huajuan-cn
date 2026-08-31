const assert = require("node:assert/strict");
const path = require("node:path");
const { factSnapshotFromPacket } = require("../analysis-fact-dto");
const { shapeCnAnalysisResponse } = require("../api/analyze");
const { KnowledgeBaseService } = require("../services/knowledgeBaseService");
const { generateAnalysisWithModelRouter, visualProviderTimeoutMs } = require("../services/modelRouter");
const { reportMaxTokens, reportProviderTimeoutMs } = require("../services/reportTextProvider");
const { buildHtpVisualAnalysisOnlyPrompt } = require("../services/prompts/htpVisualAnalysisOnlyPrompt");
const { qiaoFixture, textFixture } = require("./knowledgeRetrievalCorrectness.test");
const { DEFAULT_BUILD_ID } = require("../services/runtimeIdentity");

function stage(provider, model) {
  return { provider, model, requestUrl: `https://${provider}.invalid/v1/chat/completions`, baseUrlHost: `${provider}.invalid`, settingsSource: "sqlite", baseUrlSource: "app.env" };
}

function runtime() {
  return {
    analysisMode: "single_multimodal",
    modelConfig: {
      analysisMode: "single_multimodal",
      multimodalProvider: "qwen",
      multimodalModel: "qwen3.8-max",
      textProvider: "deepseek",
      textModel: "deepseek-chat",
      knowledgeBaseEnabled: true,
    },
    multimodal: stage("qwen", "qwen3.8-max"),
    report: stage("deepseek", "deepseek-chat"),
    vision: stage("qwen", "qwen3.8-max"),
    text: stage("deepseek", "deepseek-chat"),
  };
}

function visualResult(packet) {
  return {
    provider: "qwen",
    model: "qwen3.8-max",
    analysisPacket: packet,
    factSnapshot: factSnapshotFromPacket(packet),
    humanConfirmationNeeded: [],
    usage: { inputTokens: 1200, outputTokens: 2400, totalTokens: 3600 },
    diagnostics: { finishReason: "stop", performance: { providerLatencyMs: 8000, maxTokens: 7000, jsonTruncation: false } },
  };
}

function registry(packet, counters, { fail = false } = {}) {
  return {
    get() {
      return {
        async analyzeDrawing(args) {
          counters.visual += 1;
          assert.equal(args.requestContext.outputMode, "visual_only");
          assert.equal(args.requestContext.maxTokens, 7000);
          assert.match(args.prompt, /HTP_VISUAL_ANALYSIS_ONLY_V1/);
          assert.doesNotMatch(args.prompt, /reportMarkdown|心灵对话信/);
          if (fail) throw new Error("offline_visual_failure");
          return visualResult(structuredClone(packet));
        },
      };
    },
  };
}

function knowledgeService({ fail = false } = {}) {
  if (fail) return { groundAnalysisPacket() { throw new Error("offline_kb_failure"); } };
  const service = new KnowledgeBaseService({ directory: path.resolve(__dirname, "..", "knowledge-base"), logger: { info() {}, warn() {} } });
  assert.equal(service.load({ enabled: true }).status, "loaded");
  return service;
}

function reportGenerator(counters, prompts, markdown = "# 测试报告\n\n画面中的树干为中等宽度，树干标记值得询问其个人意义，也可能只是树节、装饰或习惯画法。不能据此确定创伤。") {
  return async ({ prompt, outputType }) => {
    counters.report += 1;
    prompts.push({ prompt, outputType });
    assert.doesNotMatch(prompt, /data:image|;base64,/i);
    return {
      markdown,
      provider: "deepseek",
      model: "deepseek-chat",
      usage: { prompt_tokens: 3200, completion_tokens: 1800, total_tokens: 5000 },
      finishReason: "stop",
      truncated: false,
      performance: { providerLatencyMs: 9000, maxTokens: reportMaxTokens(outputType), backendProviderTimeoutMs: reportProviderTimeoutMs(), responseBodyComplete: true },
    };
  };
}

async function main() {
  assert.equal(DEFAULT_BUILD_ID, "v0.9.2-final");
  const qiao = qiaoFixture();
  const counters = { visual: 0, report: 0 };
  const prompts = [];
  const first = await generateAnalysisWithModelRouter({
    images: ["data:image/png;base64,AA=="],
    userInputs: { contentType: "心灵对话", teacherConcern: "匿名测试关注" },
    modelRuntimeConfig: runtime(),
    providerRegistry: registry(qiao, counters),
    reportGenerator: reportGenerator(counters, prompts),
    knowledgeService: knowledgeService(),
  });
  assert.equal(counters.visual, 1);
  assert.equal(counters.report, 1);
  assert.equal(first.diagnostics.performance.visualReused, false);
  assert.equal(first.factSnapshot.smoke.present, "uncertain");
  assert.equal(first.factSnapshot.treeTrunk.absoluteWidth, "medium");
  assert.equal(first.factSnapshot.treeTrunk.crownToTrunkRatio, "large");
  assert.equal(first.factSnapshot.treeScars.count, 3);
  assert.equal(first.factSnapshot.roots.present, "no");
  assert.equal(first.factSnapshot.groundLine.present, "no");
  assert.equal(first.factSnapshot.house.doorPresent, "yes");
  assert.equal(first.factSnapshot.house.windowCount, 1);
  assert.equal(first.factSnapshot.person.handsPresent, "no");
  assert.equal(first.factSnapshot.person.facialFeaturesPresent, "no");
  assert(first.caseAnalysisCore.knowledge.matchedCardIds.includes("HTP-V01-073"));
  assert(first.caseAnalysisCore.knowledge.matchedCardIds.includes("KB-V02-212"));
  assert.doesNotMatch(first.caseAnalysisCore.knowledge.matchedCardIds.join(","), /KB-V02-199|KB-V02-204|KB-V02-207/);
  assert.match(prompts[0].prompt, /HTP-V01-073/);
  assert.match(prompts[0].prompt, /do_not_infer/);
  assert.doesNotMatch(JSON.stringify(first.caseAnalysisCore), /data:image|;base64,/i);
  console.log("ok - pipeline 1 QIAO visual once, knowledge grounding, text-only report");

  const second = await generateAnalysisWithModelRouter({
    images: [],
    caseAnalysisCore: first.caseAnalysisCore,
    userInputs: { contentType: "教师专业观察报告" },
    modelRuntimeConfig: runtime(),
    providerRegistry: registry(qiao, counters),
    reportGenerator: reportGenerator(counters, prompts),
    knowledgeService: knowledgeService(),
  });
  assert.equal(counters.visual, 1);
  assert.equal(counters.report, 2);
  assert.equal(second.diagnostics.performance.visualReused, true);
  assert.equal(prompts[1].outputType, "教师专业观察报告");
  console.log("ok - pipeline 2 output type switch reuses visual core");

  const failingCounters = { visual: 0, report: 0 };
  let savedCore;
  await assert.rejects(async () => {
    try {
      await generateAnalysisWithModelRouter({ images: ["data:image/png;base64,AA=="], userInputs: { contentType: "心灵对话" }, modelRuntimeConfig: runtime(), providerRegistry: registry(qiao, failingCounters), reportGenerator: async () => { failingCounters.report += 1; throw new Error("offline_report_failure"); }, knowledgeService: knowledgeService() });
    } catch (error) { savedCore = error.caseAnalysisCore; throw error; }
  }, /report_generation_failed/);
  assert(savedCore);
  await generateAnalysisWithModelRouter({ images: [], caseAnalysisCore: savedCore, userInputs: { contentType: "心灵对话" }, modelRuntimeConfig: runtime(), providerRegistry: registry(qiao, failingCounters), reportGenerator: reportGenerator(failingCounters, []), knowledgeService: knowledgeService() });
  assert.equal(failingCounters.visual, 1);
  assert.equal(failingCounters.report, 2);
  console.log("ok - pipeline 3 report failure keeps core and retry does not rerun visual");

  const visualFailCounters = { visual: 0, report: 0 };
  await assert.rejects(() => generateAnalysisWithModelRouter({ images: ["data:image/png;base64,AA=="], userInputs: { contentType: "心灵对话" }, modelRuntimeConfig: runtime(), providerRegistry: registry(qiao, visualFailCounters, { fail: true }), reportGenerator: reportGenerator(visualFailCounters, []), knowledgeService: knowledgeService() }), /visual_analysis_failed/);
  assert.deepEqual(visualFailCounters, { visual: 1, report: 0 });
  console.log("ok - pipeline 4 visual failure stops before report");

  const kbCounters = { visual: 0, report: 0 };
  const kbFallback = await generateAnalysisWithModelRouter({ images: ["data:image/png;base64,AA=="], userInputs: { contentType: "心灵对话" }, modelRuntimeConfig: runtime(), providerRegistry: registry(qiao, kbCounters), reportGenerator: reportGenerator(kbCounters, []), knowledgeService: knowledgeService({ fail: true }) });
  assert.equal(kbFallback.caseAnalysisCore.knowledge.status, "model_general_knowledge");
  console.log("ok - pipeline 5 KB failure safely degrades to model general knowledge");

  await assert.rejects(() => generateAnalysisWithModelRouter({ images: [], caseAnalysisCore: first.caseAnalysisCore, userInputs: { contentType: "教师专业观察报告" }, modelRuntimeConfig: runtime(), providerRegistry: registry(qiao, { visual: 0, report: 0 }), reportGenerator: reportGenerator({ visual: 0, report: 0 }, [], "# 报告\n\n树干很细。"), knowledgeService: knowledgeService() }), /report_fact_conflict/);
  await assert.rejects(() => generateAnalysisWithModelRouter({ images: [], caseAnalysisCore: first.caseAnalysisCore, userInputs: { contentType: "教师专业观察报告" }, modelRuntimeConfig: runtime(), providerRegistry: registry(qiao, { visual: 0, report: 0 }), reportGenerator: reportGenerator({ visual: 0, report: 0 }, [], "# 报告\n\n树疤证明曾受创伤。"), knowledgeService: knowledgeService() }), /report_knowledge_policy_conflict/);
  console.log("ok - pipeline 6 visual fact and knowledge restrictions both enforce final report");

  const textCounters = { visual: 0, report: 0 };
  const textPrompts = [];
  const textFirst = await generateAnalysisWithModelRouter({ images: ["data:image/png;base64,AA=="], userInputs: { contentType: "心灵对话" }, modelRuntimeConfig: runtime(), providerRegistry: registry(textFixture(), textCounters), reportGenerator: reportGenerator(textCounters, textPrompts), knowledgeService: knowledgeService() });
  await generateAnalysisWithModelRouter({ images: [], caseAnalysisCore: textFirst.caseAnalysisCore, userInputs: { contentType: "教师专业观察报告" }, modelRuntimeConfig: runtime(), providerRegistry: registry(textFixture(), textCounters), reportGenerator: reportGenerator(textCounters, textPrompts), knowledgeService: knowledgeService() });
  assert.deepEqual(textCounters, { visual: 1, report: 2 });
  assert(textFirst.caseAnalysisCore.knowledge.matchedFeatureCodes.includes("formal.text_as_drawing"));
  assert(textFirst.caseAnalysisCore.knowledge.matchedFeatureCodes.includes("formal.under_drawing_present"));
  assert(textFirst.caseAnalysisCore.knowledge.matchedFeatureCodes.includes("ground_line.present"));
  assert.equal(textFirst.factSnapshot.house.doorPresent, "yes");
  assert.equal(textFirst.factSnapshot.house.windowCount, 0);
  console.log("ok - pipeline 7 CASE-TEXT visual once and two report outputs");

  const outputTypes = ["心灵对话", "教师专业观察报告", "后续访谈问题", "家校沟通建议", "辅导记录初稿", "风险提示与转介建议"];
  assert.deepEqual(outputTypes.map(reportMaxTokens), [7000, 12000, 3000, 4000, 5000, 3500]);
  assert.equal(visualProviderTimeoutMs(), 600000);
  assert.equal(reportProviderTimeoutMs(), 360000);
  console.log("ok - pipeline 8 six output token policies and independent timeouts");

  const teacherPayload = shapeCnAnalysisResponse(first, { role: "teacher" });
  assert.equal(Object.hasOwn(teacherPayload, "adminDiagnostics"), false);
  assert.equal(Object.hasOwn(teacherPayload.diagnostics || {}, "performance"), false);
  assert.equal(Object.hasOwn(teacherPayload.diagnostics || {}, "pipeline"), false);
  assert.equal(Object.hasOwn(teacherPayload, "provider"), false);
  assert.equal(Object.hasOwn(teacherPayload, "model"), false);
  const adminPayload = shapeCnAnalysisResponse(first, { role: "admin" }, "data:image/png;base64,AA==");
  assert.equal(adminPayload.adminDiagnostics.performance.visualReused, false);
  assert.equal(Number.isFinite(adminPayload.adminDiagnostics.performance.totalPipelineLatencyMs), true);
  assert(adminPayload.adminDiagnostics.runtime.serverStartedAt);
  assert.equal(adminPayload.adminDiagnostics.pipeline.pipelineMode, "split_pipeline");
  assert.equal(adminPayload.adminDiagnostics.pipeline.visualPromptVersion, "HTP_VISUAL_ANALYSIS_ONLY_V1");
  assert.doesNotMatch(JSON.stringify(first.caseAnalysisCore), /data:image|;base64,|api[_-]?key|session[_-]?token/i);
  console.log("ok - pipeline 9 performance DTO is admin-only and includes runtime identity");

  const longMarkdown = `# 心灵对话\n\n${"温暖而克制的探索性叙事。".repeat(900)}`;
  const longResult = await generateAnalysisWithModelRouter({ images: [], caseAnalysisCore: first.caseAnalysisCore, userInputs: { contentType: "心灵对话" }, modelRuntimeConfig: runtime(), providerRegistry: registry(qiao, { visual: 0, report: 0 }), reportGenerator: reportGenerator({ visual: 0, report: 0 }, [], longMarkdown), knowledgeService: knowledgeService() });
  assert(longResult.reportMarkdown.length > 10000);
  assert.equal(longResult.diagnostics.performance.visualReused, true);
  assert.equal(longResult.diagnostics.performance.reportTruncation, false);
  console.log("ok - pipeline 10 long report has independent output budget from analysis JSON");

  assert.match(buildHtpVisualAnalysisOnlyPrompt(), /只负责充分、稳定、可复核地看清图像/);
  assert.doesNotMatch(buildHtpVisualAnalysisOnlyPrompt(), /完整报告 Markdown/);
  console.log("ok - pipeline 11 visual-only prompt does not request report content");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("not ok - split report pipeline offline tests");
    console.error(error?.stack || error?.message || "pipeline_test_failed");
    process.exitCode = 1;
  });
}

module.exports = { knowledgeService, registry, reportGenerator, runtime };
