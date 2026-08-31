const { analysisTimeoutMs, assertDataImage, extractChatResult, finalize, postJson } = require("./common");

const DEEPSEEK_MULTIMODAL_MAX_TOKENS = 12000;

class DeepSeekVisionProvider {
  constructor({ fetchImpl } = {}) {
    this.id = "deepseek";
    this.fetchImpl = fetchImpl;
  }

  async analyzeDrawing({ image, prompt, requestContext = {} }) {
    const startedAt = Date.now();
    assertDataImage(image);
    const stage = requestContext.runtimeStage;
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("deepseek_api_key_missing");
    const imagePreparationMs = Date.now() - startedAt;
    const visualOnly = requestContext.outputMode === "visual_only";
    const maxTokens = Number(requestContext.maxTokens || (visualOnly ? 7000 : DEEPSEEK_MULTIMODAL_MAX_TOKENS));
    const timeoutMs = analysisTimeoutMs(requestContext.timeoutMs);
    const data = await postJson({
      provider: this.id,
      stage,
      apiKey,
      fetchImpl: this.fetchImpl,
      timeoutMs,
      body: {
        model: stage.model,
        messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: image, detail: "high" } }] }],
        response_format: { type: "json_object" },
        thinking: { type: "disabled" },
        temperature: 0.2,
        max_tokens: maxTokens,
        stream: false,
      },
    });
    return finalize({
      raw: extractChatResult(data),
      provider: this.id,
      stage,
      startedAt,
      requestId: requestContext.requestId,
      performance: {
        imagePreparationMs,
        maxTokens,
        backendProviderTimeoutMs: timeoutMs,
        frontendRequestTimeoutMs: null,
      },
      outputMode: requestContext.outputMode,
    });
  }
}

module.exports = DeepSeekVisionProvider;
