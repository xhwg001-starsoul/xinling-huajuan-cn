const assert = require("node:assert/strict");
const {
  generateQwenVisionAnalysis,
  testQwenVisionConnection,
} = require("../services/providers/qwenVisionProvider");

const runtimeStage = {
  provider: "qwen",
  model: "offline-test-model",
  baseUrl: "https://example.invalid/v1",
  requestUrl: "https://example.invalid/v1/chat/completions",
  baseUrlHost: "example.invalid",
  settingsSource: "sqlite",
  baseUrlSource: "app.env",
};

function response(content) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ choices: [{ message: { content } }] }),
  };
}

async function main() {
  const originalFetch = global.fetch;
  const originalKey = process.env.QWEN_API_KEY;
  process.env.QWEN_API_KEY = "offline-test-key";
  try {
    const requests = [];
    global.fetch = async (_url, options) => {
      requests.push(JSON.parse(options.body));
      return requests.length === 1
        ? response("V2 returned invalid JSON")
        : response(JSON.stringify({ house: {}, tree: {}, person: {}, overallComposition: {} }));
    };
    const result = await generateQwenVisionAnalysis({
      image: "data:image/png;base64,AA==",
      runtimeStage,
    });
    assert.equal(result.prompt_version, "HTP_VISUAL_V1");
    assert.equal(requests.length, 2);
    assert.match(requests[0].messages[1].content[0].text, /HTP_VISUAL_HYPOTHESIS_V2/);
    assert.match(requests[1].messages[1].content[0].text, /结构化客观观察 JSON/);

    requests.length = 0;
    global.fetch = async (_url, options) => {
      requests.push(JSON.parse(options.body));
      return response("connection_ok");
    };
    await testQwenVisionConnection({ runtimeStage });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].max_tokens, 16);
    assert.match(requests[0].messages[1].content[0].text, /connection test/i);
    assert.doesNotMatch(requests[0].messages[1].content[0].text, /HTP_VISUAL_HYPOTHESIS_V2/);
    console.log("ok - V2 解析失败时仅回退 V1，管理员连接测试保持轻量");
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.QWEN_API_KEY;
    else process.env.QWEN_API_KEY = originalKey;
  }
}

main().catch((error) => {
  console.error("not ok - Qwen V2 offline provider tests");
  console.error(error?.message || "offline_test_failed");
  process.exitCode = 1;
});
