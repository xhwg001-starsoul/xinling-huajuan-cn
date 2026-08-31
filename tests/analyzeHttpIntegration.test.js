const assert = require("node:assert/strict");
const http = require("node:http");
const { createAnalyzeHandler } = require("../api/analyze");
const { EphemeralAnalysisCoreStore } = require("../services/ephemeralAnalysisCoreStore");
const { generateAnalysisWithModelRouter, HTP_VISUAL_ANALYSIS_ONLY_V1 } = require("../services/modelRouter");
const { qiaoFixture } = require("./knowledgeRetrievalCorrectness.test");
const { knowledgeService, registry, reportGenerator, runtime } = require("./splitReportPipeline.test");

async function postJson(baseUrl, body) {
  const response = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { Authorization: "Bearer offline-admin", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

async function main() {
  const counters = { visual: 0, report: 0 };
  const prompts = [];
  const coreStore = new EphemeralAnalysisCoreStore({ ttlMs: 30 * 60 * 1000, maxEntries: 20 });
  const modelRuntime = runtime();
  const handler = createAnalyzeHandler({
    getRuntimeMode: () => ({ usesCnAuth: true }),
    requireCurrentUser: (token) => {
      assert.equal(token, "offline-admin");
      return { id: "admin-fixture", organizationId: "org-fixture", role: "admin", username: "admin" };
    },
    resolveOrganizationModelRuntimeConfig: () => modelRuntime,
    recordUsage: () => {},
    analysisCoreStore: coreStore,
    generateAnalysis: (args) => generateAnalysisWithModelRouter({
      ...args,
      providerRegistry: registry(qiaoFixture(), counters),
      reportGenerator: reportGenerator(counters, prompts),
      knowledgeService: knowledgeService(),
    }),
  });
  const server = http.createServer((req, res) => {
    if (req.url === "/api/analyze") return handler(req, res);
    res.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const first = await postJson(baseUrl, {
      image: "data:image/png;base64,AA==",
      profile: { contentType: "心灵对话", teacherConcern: "匿名离线集成测试" },
    });
    assert.equal(first.status, 200);
    assert.match(first.body.analysisSessionId, /^[A-Za-z0-9_-]{32,}$/);
    assert.equal(Object.hasOwn(first.body, "caseAnalysisCore"), false);
    assert.equal(first.body.adminDiagnostics.model.promptVersion, HTP_VISUAL_ANALYSIS_ONLY_V1);
    assert.equal(first.body.adminDiagnostics.pipeline.pipelineMode, "split_pipeline");
    assert.equal(first.body.adminDiagnostics.pipeline.pipelineVersion, "v0.9.2");
    assert.equal(first.body.adminDiagnostics.pipeline.visualCalls, 1);
    assert.equal(first.body.adminDiagnostics.pipeline.reportCalls, 1);
    assert.equal(first.body.adminDiagnostics.pipeline.visualReused, false);
    assert.equal(first.body.adminDiagnostics.pipeline.caseCoreAvailable, true);
    assert(first.body.adminDiagnostics.knowledge.matchedCardIds.length > 0);
    assert(Object.keys(first.body.adminDiagnostics.performance).length > 0);
    assert(first.body.adminDiagnostics.runtime.runtimeVersion);
    assert(first.body.adminDiagnostics.runtime.buildId);
    assert(first.body.adminDiagnostics.runtime.serverStartedAt);
    assert.equal(counters.visual, 1);
    assert.equal(counters.report, 1);
    assert.doesNotMatch(JSON.stringify(first.body), /HTP_MULTIMODAL_FULL_V1|caseAnalysisCore|data:image|;base64,/i);

    const second = await postJson(baseUrl, {
      analysisSessionId: first.body.analysisSessionId,
      profile: { contentType: "教师专业观察报告", teacherConcern: "匿名离线集成测试" },
    });
    assert.equal(second.status, 200);
    assert.equal(second.body.analysisSessionId, first.body.analysisSessionId);
    assert.equal(second.body.adminDiagnostics.pipeline.visualCalls, 1);
    assert.equal(second.body.adminDiagnostics.pipeline.reportCalls, 2);
    assert.equal(second.body.adminDiagnostics.pipeline.visualReused, true);
    assert.equal(counters.visual, 1);
    assert.equal(counters.report, 2);
    assert.doesNotMatch(prompts.map((item) => item.prompt).join("\n"), /data:image|;base64,/i);

    const wrongOwnerHandler = createAnalyzeHandler({
      getRuntimeMode: () => ({ usesCnAuth: true }),
      requireCurrentUser: () => ({ id: "different-user", organizationId: "org-fixture", role: "admin" }),
      analysisCoreStore: coreStore,
    });
    const fakeReq = { method: "POST", headers: {}, body: { analysisSessionId: first.body.analysisSessionId, profile: {} } };
    let rejectedPayload = null;
    const fakeRes = { setHeader() {}, end(value) { rejectedPayload = JSON.parse(value); } };
    await wrongOwnerHandler(fakeReq, fakeRes);
    assert.equal(fakeRes.statusCode, 410);
    assert.equal(rejectedPayload.error, "analysis_session_invalid");

    const storedCore = coreStore.get(first.body.analysisSessionId, "cn:org-fixture:admin-fixture").caseAnalysisCore;
    let now = 1_000;
    const expiringStore = new EphemeralAnalysisCoreStore({ ttlMs: 60_000, maxEntries: 10, now: () => now });
    const expiringId = expiringStore.create({ ownerKey: "owner", caseAnalysisCore: storedCore });
    now += 60_001;
    assert.equal(expiringStore.get(expiringId, "owner"), null);
    now += 1;
    for (let index = 0; index < 12; index += 1) expiringStore.create({ ownerKey: "owner", caseAnalysisCore: storedCore });
    assert.equal(expiringStore.entries.size, 10);
    console.log("ok - HTTP analyze uses split pipeline and reuses server-side core by opaque session id");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error("not ok - HTTP analyze split pipeline integration");
  console.error(error?.stack || error?.message || "integration_test_failed");
  process.exitCode = 1;
});
