const { analysisTimeoutMs, assertDataImage, finalize, postChatStream } = require("./common");

const QWEN_MULTIMODAL_MAX_TOKENS = 12000;

class QwenMultimodalProvider {
  constructor({ fetchImpl } = {}) {
    this.id = "qwen";
    this.fetchImpl = fetchImpl;
  }

  async analyzeDrawing({ image, prompt, requestContext = {} }) {
    const startedAt = Date.now();
    assertDataImage(image);
    const stage = requestContext.runtimeStage;
    const apiKey = process.env.QWEN_API_KEY;
    if (!apiKey) throw new Error("qwen_api_key_missing");
    const imagePreparationMs = Date.now() - startedAt;
    const visualOnly = requestContext.outputMode === "visual_only";
    const maxTokens = Number(requestContext.maxTokens || (visualOnly ? 7000 : QWEN_MULTIMODAL_MAX_TOKENS));
    const backendProviderTimeoutMs = analysisTimeoutMs(requestContext.timeoutMs || 600000);
    let raw;
    try {
      raw = await postChatStream({
        provider: this.id,
        stage,
        apiKey,
        fetchImpl: this.fetchImpl,
        timeoutMs: backendProviderTimeoutMs,
        body: {
          model: stage.model,
          messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: image } }] }],
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: maxTokens,
        },
      });
    } catch (error) {
      error.performanceDiagnostics = {
        imagePreparationMs,
        maxTokens,
        backendProviderTimeoutMs,
        frontendRequestTimeoutMs: null,
        ...(error.performanceDiagnostics || {}),
      };
      throw error;
    }
    return finalize({
      raw,
      provider: this.id,
      stage,
      startedAt,
      requestId: requestContext.requestId,
      performance: {
        imagePreparationMs,
        maxTokens,
        backendProviderTimeoutMs,
        frontendRequestTimeoutMs: null,
      },
      outputMode: requestContext.outputMode,
    });
  }
}

module.exports = QwenMultimodalProvider;
module.exports.QWEN_MULTIMODAL_MAX_TOKENS = QWEN_MULTIMODAL_MAX_TOKENS;
