const { analysisTimeoutMs, assertDataImage, extractOpenAIResult, finalize, postJson } = require("./common");

const OPENAI_MULTIMODAL_MAX_TOKENS = 12000;

class OpenAIMultimodalProvider {
  constructor({ fetchImpl } = {}) {
    this.id = "openai";
    this.fetchImpl = fetchImpl;
  }

  async analyzeDrawing({ image, prompt, requestContext = {} }) {
    const startedAt = Date.now();
    assertDataImage(image);
    const stage = requestContext.runtimeStage;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("openai_api_key_missing");
    const imagePreparationMs = Date.now() - startedAt;
    const visualOnly = requestContext.outputMode === "visual_only";
    const maxTokens = Number(requestContext.maxTokens || (visualOnly ? 7000 : OPENAI_MULTIMODAL_MAX_TOKENS));
    const timeoutMs = analysisTimeoutMs(requestContext.timeoutMs);
    let data;
    try {
      data = await postJson({
        provider: this.id,
        stage,
        apiKey,
        fetchImpl: this.fetchImpl,
        timeoutMs,
        body: {
          model: stage.model,
          store: false,
          max_output_tokens: maxTokens,
          input: [{ role: "user", content: [{ type: "input_text", text: prompt }, { type: "input_image", image_url: image, detail: "high" }] }],
        },
      });
    } catch (error) {
      if (error.httpStatus === 400 && error.visionInputUnsupported) {
        const unsupported = new Error("configured_openai_model_not_multimodal");
        unsupported.provider = "openai";
        unsupported.model = stage.model;
        throw unsupported;
      }
      throw error;
    }
    return finalize({
      raw: extractOpenAIResult(data),
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

module.exports = OpenAIMultimodalProvider;
