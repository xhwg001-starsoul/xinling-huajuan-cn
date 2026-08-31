const assert = require("node:assert/strict");
const path = require("node:path");
const { executeVisualWithRetry } = require("../services/visualRetryPolicy");
const { buildReportInputView } = require("../services/reportInputView");
const { generateAnalysisWithModelRouter } = require("../services/modelRouter");
const { KnowledgeBaseService } = require("../services/knowledgeBaseService");
const { qiaoFixture } = require("./knowledgeRetrievalCorrectness.test");
const { knowledgeService, registry, runtime } = require("./splitReportPipeline.test");

function providerFailure(message, status, performanceDiagnostics = {}) {
  const error = new Error(message);
  if (status) error.httpStatus = status;
  error.performanceDiagnostics = performanceDiagnostics;
  return error;
}

async function retryPolicyTests() {
  let calls = 0;
  const first = await executeVisualWithRetry({
    providerTimeoutMs: 600000,
    attempt: async () => { calls += 1; return "ok"; },
  });
  assert.equal(first.result, "ok");
  assert.equal(calls, 1);

  calls = 0;
  let clock = 0;
  const recovered = await executeVisualWithRetry({
    providerTimeoutMs: 300000,
    totalBudgetMs: 480000,
    now: () => clock,
    sleep: async (ms) => { clock += ms; },
    attempt: async () => {
      calls += 1;
      clock += 1000;
      if (calls === 1) throw providerFailure("qwen_request_failed", 503);
      return "ok";
    },
  });
  assert.equal(recovered.result, "ok");
  assert.equal(recovered.diagnostics.attemptCount, 2);

  calls = 0;
  await assert.rejects(() => executeVisualWithRetry({
    providerTimeoutMs: 300000,
    attempt: async () => { calls += 1; throw providerFailure("qwen_request_failed", 401); },
  }), /qwen_request_failed/);
  assert.equal(calls, 1);

  calls = 0;
  clock = 0;
  await assert.rejects(() => executeVisualWithRetry({
    providerTimeoutMs: 300000,
    totalBudgetMs: 130000,
    now: () => clock,
    sleep: async (ms) => { clock += ms; },
    attempt: async () => { calls += 1; clock += 10000; throw providerFailure("timeout"); },
  }), /timeout/);
  assert.equal(calls, 1);

  calls = 0;
  clock = 0;
  const incompleteRecovered = await executeVisualWithRetry({
    providerTimeoutMs: 300000,
    totalBudgetMs: 480000,
    now: () => clock,
    sleep: async (ms) => { clock += ms; },
    attempt: async () => {
      calls += 1;
      clock += 1000;
      if (calls === 1) throw providerFailure("qwen_visual_analysis_json_parse_failed", 0, { responseBodyComplete: false, jsonTruncation: true });
      return "ok";
    },
  });
  assert.equal(incompleteRecovered.result, "ok");
  assert.equal(calls, 2);

  calls = 0;
  clock = 0;
  let failed;
  try {
    await executeVisualWithRetry({
      providerTimeoutMs: 300000,
      totalBudgetMs: 480000,
      now: () => clock,
      sleep: async (ms) => { clock += ms; },
      attempt: async () => { calls += 1; clock += 1000; throw providerFailure("provider_unavailable", 503); },
    });
  } catch (error) { failed = error; }
  assert(failed);
  assert.equal(calls, 2);
  assert.equal(failed.visualRetryDiagnostics.attemptCount, 2);
  console.log("ok - visual retry policy handles success, temporary failure, auth failure, budget and incomplete responses");
}

function successfulReport(markdown = "# 教师专业观察报告\n\n画面中的树干为中等宽度。相关线索需要进一步访谈确认，也可能来自绘画习惯。") {
  return {
    markdown,
    provider: "deepseek",
    model: "deepseek-chat",
    usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
    finishReason: "stop",
    truncated: false,
    performance: { providerLatencyMs: 10, maxTokens: 12000, backendProviderTimeoutMs: 360000, responseBodyComplete: true },
  };
}

async function reportRetryTests() {
  const counters = { visual: 0, report: 0 };
  const prompts = [];
  const result = await generateAnalysisWithModelRouter({
    images: ["data:image/png;base64,AA=="],
    userInputs: { contentType: "教师专业观察报告" },
    modelRuntimeConfig: runtime(),
    providerRegistry: registry(qiaoFixture(), counters),
    knowledgeService: knowledgeService(),
    reportGenerator: async ({ prompt }) => {
      counters.report += 1;
      prompts.push(prompt);
      if (counters.report === 1) return { ...successfulReport("# 教师专业观察报告\n\n未完成"), finishReason: "length", truncated: true };
      return successfulReport();
    },
  });
  assert.deepEqual(counters, { visual: 1, report: 2 });
  assert.equal(result.diagnostics.pipeline.reportCalls, 2);
  assert.equal(result.diagnostics.performance.reportRetryCount, 1);
  assert.equal(result.diagnostics.knowledge.approvedCardCount, 246);
  assert.equal(result.caseAnalysisCore.knowledge.approvedCardCount, 246);
  assert.equal(result.diagnostics.knowledge.matchedCardCount, result.caseAnalysisCore.knowledge.matchedCardIds.length);
  assert.match(prompts[1], /紧凑重试/);
  assert.match(prompts[0], /4200-6000/);
  assert.doesNotMatch(prompts.join("\n"), /不少于\s*\d+\s*字/);
  assert.doesNotMatch(prompts.join("\n"), /data:image|;base64,/i);

  const failedCounters = { visual: 0, report: 0 };
  let failure;
  try {
    await generateAnalysisWithModelRouter({
      images: ["data:image/png;base64,AA=="],
      userInputs: { contentType: "教师专业观察报告" },
      modelRuntimeConfig: runtime(),
      providerRegistry: registry(qiaoFixture(), failedCounters),
      knowledgeService: knowledgeService(),
      reportGenerator: async () => {
        failedCounters.report += 1;
        return { ...successfulReport("# 教师专业观察报告\n\n仍未完成"), finishReason: "length", truncated: true };
      },
    });
  } catch (error) { failure = error; }
  assert.equal(failure?.message, "report_generation_truncated");
  assert(failure.caseAnalysisCore);
  assert.deepEqual(failedCounters, { visual: 1, report: 2 });
  assert.equal(failure.pipelineDiagnostics.caseCoreAvailable, true);
  console.log("ok - professional report compact retry never reruns visual and preserves core after double truncation");
}

async function visualPipelineFailureTest() {
  const counters = { visual: 0, report: 0 };
  let clock = 0;
  let failure;
  try {
    await generateAnalysisWithModelRouter({
      images: ["data:image/png;base64,AA=="],
      userInputs: { contentType: "教师专业观察报告" },
      modelRuntimeConfig: runtime(),
      providerRegistry: {
        get() {
          return { async analyzeDrawing() { counters.visual += 1; throw providerFailure("qwen_request_failed", 503); } };
        },
      },
      reportGenerator: async () => { counters.report += 1; return successfulReport(); },
      knowledgeService: knowledgeService(),
      visualRetryOptions: {
        totalBudgetMs: 480000,
        now: () => clock,
        sleep: async (ms) => { clock += ms; },
      },
    });
  } catch (error) { failure = error; }
  assert.match(failure?.message || "", /^visual_analysis_failed:/);
  assert.equal(failure.caseAnalysisCore, undefined);
  assert.equal(failure.pipelineDiagnostics.caseCoreAvailable, false);
  assert.deepEqual(counters, { visual: 2, report: 0 });
  console.log("ok - two visual failures stop before core, knowledge and report generation");
}

function reportInputAndKnowledgeCountTests() {
  const service = new KnowledgeBaseService({ directory: path.resolve(__dirname, "..", "knowledge-base"), logger: { info() {}, warn() {} } });
  const status = service.load({ enabled: true });
  assert.equal(status.approvedCardCount, 246);
  const grounded = service.groundAnalysisPacket({ analysisPacket: qiaoFixture(), outputType: "教师专业观察报告", enabled: true });
  assert.equal(grounded.knowledgeContext.approvedCardCount, 246);
  assert.equal(grounded.knowledgeContext.matchedCardCount, grounded.knowledgeContext.matchedCardIds.length);
  assert.notEqual(grounded.knowledgeContext.approvedCardCount, grounded.knowledgeContext.matchedCardCount);

  const view = buildReportInputView({
    visualAnalysis: { analysisPacket: grounded.analysisPacket, criticalVisualFacts: { treeTrunk: { absoluteWidth: "medium" } }, humanConfirmationNeeded: ["smoke"] },
    knowledge: {
      knowledgeBaseVersion: "0.2",
      status: "loaded",
      approvedCardCount: 246,
      matchedCardCount: grounded.knowledgeContext.matchedCardCount,
      selectedContext: [...grounded.knowledgeContext.evidenceCards, ...grounded.knowledgeContext.restrictedCards],
    },
    hypotheses: grounded.analysisPacket.hypothesis_candidates,
    strengthsAndResources: grounded.analysisPacket.strengths_and_resources,
    priorityQuestions: grounded.analysisPacket.priority_questions,
    safety: grounded.analysisPacket.safety,
    context: { teacherConcern: "匿名离线测试" },
  });
  const serialized = JSON.stringify(view);
  assert.equal(view.knowledge.approvedCardCount, 246);
  assert(view.observations.length <= 10);
  assert.doesNotMatch(serialized, /data:image|;base64,|imageMetadata|handoff_summary|verification_checks/i);
  assert.match(serialized, /doNotInfer|alternativeExplanations/);
  console.log("ok - ReportInputView is compact and knowledge approved/matched counts remain distinct");
}

async function main() {
  await retryPolicyTests();
  await visualPipelineFailureTest();
  await reportRetryTests();
  reportInputAndKnowledgeCountTests();
}

if (require.main === module) {
  main().catch((error) => {
    console.error("not ok - v0.9.2d stability tests");
    console.error(error?.stack || error?.message || "stability_test_failed");
    process.exitCode = 1;
  });
}
