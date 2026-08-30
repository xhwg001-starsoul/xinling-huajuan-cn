const { assertDataImage, extractOpenAIResult, finalize, postJson } = require("./common");

class OpenAIMultimodalProvider {
  constructor({ fetchImpl } = {}) {
    this.id = "openai";
    this.fetchImpl = fetchImpl;
  }

  async analyzeDrawing({ image, prompt, requestContext = {} }) {
    assertDataImage(image);
    const stage = requestContext.runtimeStage;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("openai_api_key_missing");
    const startedAt = Date.now();
    let data;
    try {
      data = await postJson({
        provider: this.id,
        stage,
        apiKey,
        fetchImpl: this.fetchImpl,
        body: {
          model: stage.model,
          store: false,
          max_output_tokens: 12000,
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
    return finalize({ raw: extractOpenAIResult(data), provider: this.id, stage, startedAt, requestId: requestContext.requestId });
  }
}

module.exports = OpenAIMultimodalProvider;
