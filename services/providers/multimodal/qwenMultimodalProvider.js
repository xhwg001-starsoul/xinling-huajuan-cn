const { assertDataImage, finalize, postChatStream } = require("./common");

class QwenMultimodalProvider {
  constructor({ fetchImpl } = {}) {
    this.id = "qwen";
    this.fetchImpl = fetchImpl;
  }

  async analyzeDrawing({ image, prompt, requestContext = {} }) {
    assertDataImage(image);
    const stage = requestContext.runtimeStage;
    const apiKey = process.env.QWEN_API_KEY;
    if (!apiKey) throw new Error("qwen_api_key_missing");
    const startedAt = Date.now();
    const raw = await postChatStream({
      provider: this.id,
      stage,
      apiKey,
      fetchImpl: this.fetchImpl,
      body: {
        model: stage.model,
        messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: image } }] }],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 12000,
      },
    });
    return finalize({ raw, provider: this.id, stage, startedAt, requestId: requestContext.requestId });
  }
}

module.exports = QwenMultimodalProvider;
