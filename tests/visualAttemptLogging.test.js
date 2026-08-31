const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { generateAnalysisWithModelRouter } = require("../services/modelRouter");
const { VisualAttemptLogger } = require("../services/visualAttemptLogger");
const { knowledgeService, registry, runtime } = require("./splitReportPipeline.test");
const { qiaoFixture } = require("./knowledgeRetrievalCorrectness.test");

function providerError(status, message = "provider request failed") {
  const error = new Error(message);
  error.httpStatus = status;
  return error;
}

function sequencedRegistry(sequence, counters) {
  const base = registry(qiaoFixture(), { visual: 0, report: 0 }).get();
  return {
    get() {
      return {
        async analyzeDrawing(args) {
          counters.visual += 1;
          const next = sequence.shift();
          if (next instanceof Error) throw next;
          return base.analyzeDrawing(args);
        },
      };
    },
  };
}

function safeReport(counters) {
  return async () => {
    counters.report += 1;
    return {
      markdown: "# 离线报告\n\n画面事实需要结合访谈确认。",
      provider: "deepseek",
      model: "offline-report",
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      finishReason: "stop",
      truncated: false,
      performance: { providerLatencyMs: 1, maxTokens: 7000, responseBodyComplete: true },
    };
  };
}

function readJsonLines(directory) {
  const filePath = path.join(directory, "visual-attempts.log");
  return fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

async function runScenario({ directory, sequence, requestCounters }) {
  const logger = new VisualAttemptLogger({ logsDir: directory, warningLogger: { warn() {} } });
  try {
    const result = await generateAnalysisWithModelRouter({
      images: ["data:image/png;base64,AA=="],
      userInputs: { contentType: "心灵对话" },
      modelRuntimeConfig: runtime(),
      providerRegistry: sequencedRegistry([...sequence], requestCounters),
      knowledgeService: knowledgeService(),
      reportGenerator: safeReport(requestCounters),
      visualRetryOptions: { attemptLogger: logger, backoffMs: 0, sleep: async () => {} },
    });
    return { result };
  } catch (error) {
    return { error };
  }
}

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "xinling-visual-log-"));
  try {
    const successDir = path.join(root, "success");
    const successCounters = { visual: 0, report: 0 };
    const success = await runScenario({ directory: successDir, sequence: ["success"], requestCounters: successCounters });
    assert(success.result);
    const successLines = readJsonLines(successDir);
    assert.deepEqual(successLines.map((item) => [item.event, item.status]), [["visual_attempt", "success"], ["visual_stage_result", "success"]]);
    assert.deepEqual(successCounters, { visual: 1, report: 1 });

    const retryDir = path.join(root, "retry");
    const retryCounters = { visual: 0, report: 0 };
    const retry = await runScenario({ directory: retryDir, sequence: [providerError(503), "success"], requestCounters: retryCounters });
    assert(retry.result);
    const retryLines = readJsonLines(retryDir);
    assert.equal(retryLines[0].attemptNumber, 1);
    assert.equal(retryLines[0].status, "failed");
    assert.equal(retryLines[0].httpStatus, 503);
    assert.equal(retryLines[0].normalizedErrorCode, "provider_unavailable");
    assert.equal(retryLines[0].retryable, true);
    assert.equal(retryLines[0].retryReason, "http_503");
    assert.equal(typeof retryLines[0].timeoutMs, "number");
    assert.equal(typeof retryLines[0].budgetRemainingMs, "number");
    assert.equal(retryLines[1].attemptNumber, 2);
    assert.equal(retryLines[1].status, "success");
    assert.deepEqual({ count: retryLines[2].visualAttemptCount, retries: retryLines[2].visualRetryCount, status: retryLines[2].status }, { count: 2, retries: 1, status: "success" });
    assert.deepEqual(retryCounters, { visual: 2, report: 1 });

    const authDir = path.join(root, "auth");
    const authCounters = { visual: 0, report: 0 };
    const auth = await runScenario({ directory: authDir, sequence: [providerError(401)], requestCounters: authCounters });
    assert.match(auth.error?.message || "", /visual_analysis_failed/);
    const authLines = readJsonLines(authDir);
    assert.equal(authLines.length, 2);
    assert.deepEqual({ attempt: authLines[0].attemptNumber, retryable: authLines[0].retryable, code: authLines[0].normalizedErrorCode }, { attempt: 1, retryable: false, code: "authentication_failed" });
    assert.deepEqual({ count: authLines[1].visualAttemptCount, retries: authLines[1].visualRetryCount, status: authLines[1].status }, { count: 1, retries: 0, status: "failed" });
    assert.deepEqual(authCounters, { visual: 1, report: 0 });

    const doubleDir = path.join(root, "double-503");
    const doubleCounters = { visual: 0, report: 0 };
    const double = await runScenario({ directory: doubleDir, sequence: [providerError(503), providerError(503)], requestCounters: doubleCounters });
    assert.match(double.error?.message || "", /visual_analysis_failed/);
    const doubleLines = readJsonLines(doubleDir);
    assert.deepEqual(doubleLines.map((item) => item.status), ["failed", "failed", "failed"]);
    assert.deepEqual({ count: doubleLines[2].visualAttemptCount, retries: doubleLines[2].visualRetryCount, code: doubleLines[2].finalErrorCode }, { count: 2, retries: 1, code: "provider_unavailable" });
    assert.deepEqual(doubleCounters, { visual: 2, report: 0 });

    const warnings = [];
    const failingFs = { mkdirSync() { const error = new Error("sensitive write failure"); error.code = "EACCES"; throw error; } };
    const failingLogger = new VisualAttemptLogger({ logsDir: path.join(root, "unwritable"), fsImpl: failingFs, warningLogger: { warn(value) { warnings.push(value); } } });
    const loggingFailureCounters = { visual: 0, report: 0 };
    const loggingFailure = await generateAnalysisWithModelRouter({
      images: ["data:image/png;base64,AA=="],
      userInputs: { contentType: "心灵对话" },
      modelRuntimeConfig: runtime(),
      providerRegistry: sequencedRegistry(["success"], loggingFailureCounters),
      knowledgeService: knowledgeService(),
      reportGenerator: safeReport(loggingFailureCounters),
      visualRetryOptions: { attemptLogger: failingLogger, backoffMs: 0, sleep: async () => {} },
    });
    assert(loggingFailure.success);
    assert(warnings.length >= 2);
    assert(warnings.every((line) => !/sensitive write failure/i.test(line)));

    const sensitiveDir = path.join(root, "sensitive");
    const sensitiveLogger = new VisualAttemptLogger({ logsDir: sensitiveDir, warningLogger: { warn() {} } });
    const secrets = [
      "sk-fake-secret-value",
      "data:image/png;base64,FAKEIMAGE",
      "FAKE_STUDENT_NAME",
      "FAKE_BACKGROUND_BODY",
      "FAKE_PROMPT_BODY",
      "FAKE_REPORT_BODY",
      "FAKE_REASONING_CONTENT",
    ];
    sensitiveLogger.attempt({
      requestId: "offline-sensitive",
      attemptNumber: 1,
      provider: "qwen",
      model: "offline-model",
      status: "failed",
      latencyMs: 1,
      timeoutMs: 2,
      normalizedErrorCode: "provider_unavailable",
      httpStatus: 503,
      retryable: true,
      retryReason: "http_503",
      budgetRemainingMs: 3,
      apiKey: secrets[0], image: secrets[1], studentName: secrets[2], background: secrets[3], prompt: secrets[4], report: secrets[5], reasoning_content: secrets[6],
    });
    const sensitiveText = fs.readFileSync(path.join(sensitiveDir, "visual-attempts.log"), "utf8");
    for (const secret of secrets) assert.doesNotMatch(sensitiveText, new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    for (const line of sensitiveText.trim().split(/\r?\n/)) assert.doesNotThrow(() => JSON.parse(line));

    const rotationDir = path.join(root, "rotation");
    const rotationLogger = new VisualAttemptLogger({ logsDir: rotationDir, maxBytes: 1024, warningLogger: { warn() {} } });
    for (let index = 0; index < 30; index += 1) {
      rotationLogger.attempt({ requestId: `rotation-${index}`, attemptNumber: 1, provider: "qwen", model: "offline-model", status: "success", latencyMs: 1, timeoutMs: 2, budgetRemainingMs: 3, pipelineVersion: "v0.9.2" });
    }
    assert.equal(fs.existsSync(path.join(rotationDir, "visual-attempts.log")), true);
    assert.equal(fs.existsSync(path.join(rotationDir, "visual-attempts.log.1")), true);
    for (const name of ["visual-attempts.log", "visual-attempts.log.1"]) {
      const text = fs.readFileSync(path.join(rotationDir, name), "utf8");
      for (const line of text.trim().split(/\r?\n/)) assert.doesNotThrow(() => JSON.parse(line));
    }

    console.log("ok - visual attempt JSONL success, retry, auth, double failure, best-effort, redaction and rotation tests");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("not ok - visual attempt logging tests");
    console.error(error?.stack || error?.message || "visual_attempt_logging_test_failed");
    process.exitCode = 1;
  });
}
