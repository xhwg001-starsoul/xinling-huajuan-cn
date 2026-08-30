const { assertDataImage, extractChatResult, finalize, postJson } = require("./common");

class DeepSeekVisionProvider {
  constructor({ fetchImpl } = {}) {
    this.id = "deepseek";
    this.fetchImpl = fetchImpl;
  }

  async analyzeDrawing({ image, prompt, requestContext = {} }) {
    assertDataImage(image);
    const stage = requestContext.runtimeStage;
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("deepseek_api_key_missing");
    const startedAt = Date.now();
    const data = await postJson({
      provider: this.id,
      stage,
      apiKey,
      fetchImpl: this.fetchImpl,
      body: {
        model: stage.model,
        messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: image, detail: "high" } }] }],
        response_format: { type: "json_object" },
        thinking: { type: "disabled" },
        temperature: 0.2,
        max_tokens: 12000,
        stream: false,
      },
    });
    return finalize({ raw: extractChatResult(data), provider: this.id, stage, startedAt, requestId: requestContext.requestId });
  }
}

module.exports = DeepSeekVisionProvider;
