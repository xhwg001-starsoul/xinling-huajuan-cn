const OpenAIMultimodalProvider = require("./providers/multimodal/openaiMultimodalProvider");
const QwenMultimodalProvider = require("./providers/multimodal/qwenMultimodalProvider");
const DeepSeekVisionProvider = require("./providers/multimodal/deepseekVisionProvider");

function createMultimodalProviderRegistry(options = {}) {
  const providers = new Map([
    ["openai", new OpenAIMultimodalProvider(options)],
    ["qwen", new QwenMultimodalProvider(options)],
    ["deepseek", new DeepSeekVisionProvider(options)],
  ]);
  return {
    get(providerId) {
      const provider = providers.get(String(providerId || "").toLowerCase());
      if (!provider) throw new Error("multimodal_provider_not_implemented");
      return provider;
    },
    list() {
      return [...providers.keys()];
    },
  };
}

const multimodalProviderRegistry = createMultimodalProviderRegistry();

module.exports = { createMultimodalProviderRegistry, multimodalProviderRegistry };
