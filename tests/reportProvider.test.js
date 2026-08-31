const assert = require("node:assert/strict");
const { normalizeUsage } = require("../services/multimodalAnalysisResult");
const { callTextProvider } = require("../services/modelConnectionTestService");
const { generateTextReport } = require("../services/reportTextProvider");
const {
  getReportReasoningConfig,
  isAlibabaCompatibleStage,
} = require("../services/reportProviderConfig");
const { generateAnalysisWithModelRouter } = require("../services/modelRouter");
const { buildReportInputView } = require("../services/reportInputView");
const { buildReportFromCaseCorePrompt } = require("../services/prompts/htpReportPrompt");
const { knowledgeService, registry, runtime } = require("./splitReportPipeline.test");
const { qiaoFixture } = require("./knowledgeRetrievalCorrectness.test");

function stage(provider, host, model) {
  const baseUrl = `https://${host}/compatible-mode/v1`;
  return {
    provider,
    model,
    baseUrl,
    baseUrlHost: host,
    requestUrl: `${baseUrl}/chat/completions`,
    settingsSource: "sqlite",
    baseUrlSource: "app.env",
  };
}

function jsonResponse(body) {
  return { ok: true, status: 200, json: async () => body };
}

async function requestBodyTests() {
  const previousDeepSeekKey = process.env.DEEPSEEK_API_KEY;
  const previousQwenKey = process.env.QWEN_API_KEY;
  process.env.DEEPSEEK_API_KEY = "offline-deepseek-key";
  process.env.QWEN_API_KEY = "offline-qwen-key";
  try {
    const deepseekStage = stage("deepseek", "workspace.cn-beijing.maas.aliyuncs.com", "deepseek-v4-flash");
    assert.equal(isAlibabaCompatibleStage(deepseekStage), true);
    assert.deepEqual(getReportReasoningConfig(deepseekStage), { enable_thinking: false });

    let formalBody;
    const report = await generateTextReport({
      stage: deepseekStage,
      prompt: "匿名纯文本报告输入",
      outputType: "教师专业观察报告",
      requestId: "offline-report",
      fetchImpl: async (_url, options) => {
        formalBody = JSON.parse(options.body);
        return jsonResponse({
          choices: [{ finish_reason: "stop", message: { content: "# 教师专业观察报告\n\n连接成功。", reasoning_content: "must_not_be_exposed" } }],
          usage: { prompt_tokens: 50, completion_tokens: 80, completion_tokens_details: { reasoning_tokens: 0 }, total_tokens: 130 },
        });
      },
    });
    assert.equal(formalBody.enable_thinking, false);
    assert.equal(formalBody.temperature, 0.7);
    assert.equal(formalBody.max_tokens, 12000);
    assert.equal(Object.hasOwn(formalBody, "thinking"), false);
    assert.doesNotMatch(JSON.stringify(formalBody), /data:image|;base64,/i);
    assert.equal(report.performance.reportReasoningMode, "disabled");
    assert.doesNotMatch(JSON.stringify(report), /must_not_be_exposed/);

    let connectionBody;
    await callTextProvider(deepseekStage, {
      fetchImpl: async (_url, options) => {
        connectionBody = JSON.parse(options.body);
        return jsonResponse({ choices: [{ finish_reason: "stop", message: { content: "connection_ok" } }], usage: {} });
      },
    });
    assert.deepEqual(
      { enable_thinking: connectionBody.enable_thinking },
      { enable_thinking: formalBody.enable_thinking },
    );

    const qwenConfig = getReportReasoningConfig(stage("qwen", "dashscope.aliyuncs.com", "qwen-plus"));
    const openaiConfig = getReportReasoningConfig(stage("openai", "api.openai.com", "gpt-4o-mini"));
    assert.deepEqual(qwenConfig, {});
    assert.deepEqual(openaiConfig, {});
    console.log("ok - Alibaba DeepSeek report and connection test share enable_thinking=false; other providers stay unchanged");
  } finally {
    if (previousDeepSeekKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = previousDeepSeekKey;
    if (previousQwenKey === undefined) delete process.env.QWEN_API_KEY;
    else process.env.QWEN_API_KEY = previousQwenKey;
  }
}

function usageFixtureTest() {
  const usage = normalizeUsage({
    prompt_tokens: 5000,
    completion_tokens: 12000,
    completion_tokens_details: { reasoning_tokens: 9000 },
    total_tokens: 17000,
  });
  assert.equal(usage.inputTokens, 5000);
  assert.equal(usage.completionTokens, 12000);
  assert.equal(usage.reasoningTokens, 9000);
  assert.equal(usage.outputTokens, 12000);
  assert.equal(normalizeUsage({ completion_tokens: 100 }).reasoningTokens, null);
  console.log("ok - usage fixture separates provider completion tokens from reasoning token count");
}

function reportInputDeduplicationTest() {
  const repeatedRestriction = "不得据此作出确定心理诊断";
  const repeatedAlternative = "也可能只是构图习惯";
  const core = {
    visualAnalysis: {
      criticalVisualFacts: { smoke: { present: "uncertain" } },
      humanConfirmationNeeded: ["smoke.present"],
      analysisPacket: {
        visual_observations: {
          overall: [{
            observation_id: "OBS-1",
            object: "overall",
            feature: "smoke",
            description: "烟云形态无法确定",
            visual_evidence: "烟云形态无法确定",
            confidence: "medium",
            psychological_salience: "medium",
          }],
        },
        salient_features: [],
        hypothesis_candidates: [],
      },
    },
    hypotheses: [{
      hypothesis_id: "H-1",
      provisional_hypothesis: "需要访谈确认",
      alternative_explanations: [repeatedAlternative],
      requires_inquiry: true,
      user_facing_allowed: false,
    }],
    priorityQuestions: ["这部分对你意味着什么？"],
    safety: { doNotDiagnose: true },
    knowledge: {
      knowledgeBaseVersion: "0.2",
      status: "loaded",
      approvedCardCount: 246,
      matchedCardCount: 2,
      selectedContext: [
        { card_id: "K-1", card_role: "system_guardrail", evidence_level: "D", automation_policy: "restricted", user_facing_allowed: false, requires_inquiry_confirmation: true, matched_feature_code: "smoke.uncertain", do_not_infer: [repeatedRestriction], alternative_explanations: [repeatedAlternative] },
        { card_id: "K-2", card_role: "exploratory_hypothesis", evidence_level: "E", automation_policy: "restricted", user_facing_allowed: false, requires_inquiry_confirmation: true, matched_feature_code: "smoke.uncertain", do_not_infer: [repeatedRestriction], alternative_explanations: [repeatedAlternative] },
      ],
    },
  };
  const view = buildReportInputView(core);
  assert.equal(Object.hasOwn(view.context, "teacherConcern"), false);
  assert.equal(Object.hasOwn(view.observations[0], "visualEvidence"), false);
  assert.deepEqual(view.knowledge.globalDoNotInfer, [repeatedRestriction]);
  assert.deepEqual(view.knowledge.globalAlternativeExplanations, [repeatedAlternative]);
  assert.deepEqual(view.knowledge.cards.map((card) => card.evidenceLevel), ["D", "E"]);
  assert(view.knowledge.cards.every((card) => card.requiresInquiry && !card.userFacingAllowed));
  const prompt = buildReportFromCaseCorePrompt({
    caseAnalysisCore: core,
    profile: { teacherConcern: "匿名教师关注" },
    outputType: "教师专业观察报告",
  });
  assert.match(prompt, /匿名教师关注/);
  assert.match(prompt, /不得据此作出确定心理诊断/);
  console.log("ok - ReportInputView deduplicates repeated text without removing safeguards or teacher concern");
}

function reportResult({ inputTokens, completionTokens, reasoningTokens, finishReason, markdown }) {
  return {
    markdown,
    provider: "deepseek",
    model: "deepseek-v4-flash",
    usage: {
      prompt_tokens: inputTokens,
      completion_tokens: completionTokens,
      completion_tokens_details: { reasoning_tokens: reasoningTokens },
      total_tokens: inputTokens + completionTokens,
    },
    finishReason,
    truncated: finishReason === "length",
    performance: {
      providerLatencyMs: 10,
      maxTokens: 12000,
      backendProviderTimeoutMs: 360000,
      responseBodyComplete: true,
      reportReasoningMode: "disabled",
    },
  };
}

async function multiAttemptDiagnosticsTest() {
  const counters = { visual: 0, report: 0 };
  const result = await generateAnalysisWithModelRouter({
    images: ["data:image/png;base64,AA=="],
    userInputs: { contentType: "教师专业观察报告" },
    modelRuntimeConfig: runtime(),
    providerRegistry: registry(qiaoFixture(), counters),
    knowledgeService: knowledgeService(),
    reportGenerator: async () => {
      counters.report += 1;
      return counters.report === 1
        ? reportResult({ inputTokens: 5000, completionTokens: 12000, reasoningTokens: 9000, finishReason: "length", markdown: "# 教师专业观察报告\n\n未完成" })
        : reportResult({ inputTokens: 4800, completionTokens: 3000, reasoningTokens: 500, finishReason: "stop", markdown: "# 教师专业观察报告\n\n画面事实与探索方向均需结合访谈确认。" });
    },
  });
  const performance = result.diagnostics.performance;
  assert.equal(performance.reportTotalInputTokens, 9800);
  assert.equal(performance.reportTotalCompletionTokens, 15000);
  assert.equal(performance.reportTotalReasoningTokens, 9500);
  assert.deepEqual(performance.reportAttempts.map((attempt) => ({
    inputTokens: attempt.inputTokens,
    completionTokens: attempt.completionTokens,
    reasoningTokens: attempt.reasoningTokens,
  })), [
    { inputTokens: 5000, completionTokens: 12000, reasoningTokens: 9000 },
    { inputTokens: 4800, completionTokens: 3000, reasoningTokens: 500 },
  ]);
  assert.equal(performance.reportAttempts[1].visibleOutputChars, result.reportMarkdown.length);
  assert.equal(performance.reportCompactFallbackUsed, true);
  assert.equal(performance.reportStatus, "ready");
  assert.deepEqual(counters, { visual: 1, report: 2 });

  const oneAttemptCounters = { visual: 0, report: 0 };
  const oneAttempt = await generateAnalysisWithModelRouter({
    images: ["data:image/png;base64,AA=="],
    userInputs: { contentType: "教师专业观察报告" },
    modelRuntimeConfig: runtime(),
    providerRegistry: registry(qiaoFixture(), oneAttemptCounters),
    knowledgeService: knowledgeService(),
    reportGenerator: async () => {
      oneAttemptCounters.report += 1;
      return reportResult({ inputTokens: 4800, completionTokens: 3000, reasoningTokens: 0, finishReason: "stop", markdown: "# 教师专业观察报告\n\n报告完整结束。" });
    },
  });
  assert.equal(oneAttempt.diagnostics.performance.reportAttemptCount, 1);
  assert.equal(oneAttempt.diagnostics.performance.reportRetryCount, 0);
  assert.equal(oneAttempt.diagnostics.performance.reportCompactFallbackUsed, false);
  assert.equal(oneAttempt.diagnostics.performance.reportStatus, "ready");
  assert.deepEqual(oneAttemptCounters, { visual: 1, report: 1 });
  console.log("ok - per-attempt and cumulative report token diagnostics are unambiguous and visual is not rerun");
}

async function main() {
  await requestBodyTests();
  usageFixtureTest();
  reportInputDeduplicationTest();
  await multiAttemptDiagnosticsTest();
}

if (require.main === module) {
  main().catch((error) => {
    console.error("not ok - report provider offline tests");
    console.error(error?.stack || error?.message || "report_provider_test_failed");
    process.exitCode = 1;
  });
}
