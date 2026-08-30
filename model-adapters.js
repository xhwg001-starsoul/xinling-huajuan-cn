// 模型适配器层：把具体模型供应商封装在后端，方便以后在 OpenAI、Qwen、豆包、智谱、讯飞、StepFun 等模型之间切换。
// 所有 API Key 只能从后端环境变量读取，不能写进前端 HTML、JS 或可公开访问的配置文件。

const { generateQwenVisionAnalysis } = require("./services/providers/qwenVisionProvider");
const { PROVIDERS, resolveModelRuntimeConfig } = require("./services/modelRuntimeConfigService");
const { FACT_FIDELITY_RULES } = require("./services/prompts/factFidelityRules");

const CONTENT_TYPES = {
  dialogue: "心灵对话",
  professional: "教师专业观察报告",
  interview: "后续访谈问题",
  family: "家校沟通建议",
  counselingRecord: "辅导记录初稿",
  riskReferral: "风险提示与转介建议",
};

const TEXT_ANALYSIS_SYSTEM_PROMPT = `你是一名专业、谨慎、有温度的学校心理辅导辅助分析助手。你只基于用户提供的纯文本材料生成辅助报告，不做医学诊断，不夸大结论。

上游 hypothesis_candidates 只是多模态模型产生的待验证工作假设，不是事实。不得因为上游模型已经提出，就把它写成确定结论。
必须保留每个重要视觉判断的 confidence：high 可进入候选主题；medium 只能作为带不确定性的次级线索；low 不得成为心理解释依据。
alternative_explanations、supporting_information_needed 和 disconfirming_information 都是分析边界，不得省略其含义或把候选假设单向强化。
当前产品尚未完成 Inquiry 验证。最终报告必须使用“可能”“值得进一步了解”“可以关注”“建议通过沟通确认”等探索性表达，不得假装已经完成访谈验证。
若 safety.safety_followup_needed=true，只能建议由受过训练的人员进行直接人工核查，不得生成概率、分数、具体事件推断或诊断。`;

function normalizeContentType(profile = {}) {
  const raw = profile.contentType || profile.desiredHelp || profile.reportMode || CONTENT_TYPES.dialogue;
  const aliases = {
    dialogue: CONTENT_TYPES.dialogue,
    standard: CONTENT_TYPES.dialogue,
    心灵对话: CONTENT_TYPES.dialogue,
    professional: CONTENT_TYPES.professional,
    deep: CONTENT_TYPES.professional,
    专业观察报告: CONTENT_TYPES.professional,
    教师专业报告: CONTENT_TYPES.professional,
    教师专业观察报告: CONTENT_TYPES.professional,
    生成初步观察报告: CONTENT_TYPES.professional,
    生成访谈问题: CONTENT_TYPES.interview,
    后续访谈问题: CONTENT_TYPES.interview,
    生成家校沟通建议: CONTENT_TYPES.family,
    家校沟通建议: CONTENT_TYPES.family,
    生成辅导记录初稿: CONTENT_TYPES.counselingRecord,
    辅导记录初稿: CONTENT_TYPES.counselingRecord,
    风险提示与转介建议: CONTENT_TYPES.riskReferral,
  };
  return aliases[raw] || CONTENT_TYPES.dialogue;
}

const documentPlans = {
  心灵对话: {
    title: "心灵对话",
    sections: [],
  },
  教师专业观察报告: {
    title: "房树人绘画心理观察辅助报告",
    sections: [
      "基本信息摘要",
      "绘画任务与资料来源说明",
      "画面客观描述",
      "关于“房子”的观察线索",
      "关于“树木”的观察线索",
      "关于“人物”的观察线索",
      "整体构图与情绪氛围",
      "结合背景资料的可能心理线索",
      "保护性资源与积极因素",
      "风险提示与进一步评估建议",
      "建议访谈问题",
      "教师辅导建议",
      "后续跟进建议",
      "报告限制与免责声明",
    ],
  },
  后续访谈问题: {
    title: "后续访谈问题建议",
    sections: ["访谈准备摘要", "从画面进入谈话的暖场问题", "围绕房子的开放式问题", "围绕树木的开放式问题", "围绕人物的开放式问题", "结合近期表现的澄清问题", "安全感、支持资源与求助意愿问题", "风险评估相关的温和询问", "教师提问注意事项", "后续访谈记录建议", "使用限制与免责声明"],
  },
  家校沟通建议: {
    title: "家校沟通建议",
    sections: ["沟通前信息摘要", "建议沟通目标", "与家长沟通的表达原则", "可以向家长了解的问题", "可以反馈给家长的观察内容", "家庭支持建议", "学校后续配合建议", "风险情形下的沟通提醒", "可直接参考的沟通话术", "使用限制与免责声明"],
  },
  辅导记录初稿: {
    title: "心理辅导记录初稿",
    sections: ["基本信息", "辅导背景与资料来源", "学生近期主要表现", "学生本人描述摘要", "房树人图画客观观察摘要", "初步观察线索", "保护性因素与可用资源", "风险信息与处置建议", "本次辅导目标建议", "个别谈话过程记录初稿", "教师回应与支持策略", "家校沟通或班级观察建议", "后续跟进计划", "记录限制与免责声明"],
  },
  风险提示与转介建议: {
    title: "风险提示与转介建议",
    sections: ["风险信息摘要", "画面中需要谨慎关注的风险线索", "背景资料中的风险线索", "风险等级的初步分层理解", "需要进一步人工评估的问题", "危机干预启动建议", "转介与协作建议", "与监护人沟通提醒", "后续观察与记录建议", "使用限制与免责声明"],
  },
};

function selectedPlan(profile) {
  return documentPlans[normalizeContentType(profile)] || documentPlans[CONTENT_TYPES.dialogue];
}

function providerConfig(providerKey) {
  const config = PROVIDERS[providerKey];
  if (!config) {
    throw new Error(`暂不支持的模型供应商：${providerKey}`);
  }
  return config;
}

function assertProviderReady(providerKey, step, modelConfig, modelRuntimeConfig) {
  const config = providerConfig(providerKey);
  const runtime = modelRuntimeConfig || resolveModelRuntimeConfig(modelConfig || {}, {
    source: modelConfig?.source || "default",
  });
  const stage = step === "vision" ? runtime.vision : runtime.text;
  if (stage.provider !== providerKey) {
    const error = new Error("model_runtime_provider_mismatch");
    error.provider = providerKey;
    throw error;
  }
  if (!config.implemented) {
    throw new Error(`${config.name} 适配器已预留配置，但当前尚未接入真实调用逻辑。请先实现该供应商的后端适配器并设置 ${config.apiKeyEnv}。`);
  }
  if (step === "vision" && config.supportsVision === false) {
    const error = new Error("provider_not_implemented");
    error.provider = providerKey;
    throw error;
  }
  if (!process.env[config.apiKeyEnv]) {
    if (providerKey === "deepseek") {
      throw new Error("deepseek_api_key_missing");
    }
    throw new Error(`还没有读取到 ${config.apiKeyEnv}。请在后端环境变量中设置该 API Key。`);
  }
  return {
    config,
    apiKey: process.env[config.apiKeyEnv],
    baseUrl: stage.baseUrl,
    requestUrl: stage.requestUrl,
    model: stage.model,
    stage,
  };
}

function extractOutputText(response) {
  if (typeof response.output_text === "string") return response.output_text;
  const texts = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) texts.push(content.text);
    }
  }
  return texts.join("\n").trim();
}

async function callOpenAI({ prompt, image, step, maxOutputTokens, modelConfig, modelRuntimeConfig }) {
  const { apiKey, requestUrl, model } = assertProviderReady("openai", step, modelConfig, modelRuntimeConfig);
  const content = [{ type: "input_text", text: prompt }];
  if (image) {
    content.push({ type: "input_image", image_url: image, detail: "high" });
  }

  const response = await fetch(requestUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_output_tokens: maxOutputTokens,
      input: [{ role: "user", content }],
    }),
  });

  const responseText = await response.text();
  let data = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new Error(`模型返回了非 JSON 内容：${responseText.slice(0, 300)}`);
  }
  if (!response.ok) {
    throw new Error(data.error?.message || `${providerConfig("openai").name} 调用失败`);
  }
  return extractOutputText(data);
}

function extractChatCompletionText(response) {
  const choice = response.choices?.[0];
  const content = choice?.message?.content;
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === "string" ? item : item.text || ""))
      .join("\n")
      .trim();
  }
  return typeof content === "string" ? content.trim() : "";
}

function containsImagePayload(value) {
  const text = String(value || "");
  return /data:image\//i.test(text) || /;base64,/i.test(text) || /base64,[A-Za-z0-9+/=]{80,}/i.test(text);
}

function summarizeDeepSeekError(data, fallback) {
  const error = data?.error || {};
  return {
    code: error.code || data?.code || "",
    message: String(error.message || data?.message || fallback || "DeepSeek 调用失败").slice(0, 160),
  };
}

function logDeepSeekDebug(summary) {
  if (process.env.MODEL_DEBUG !== "1") return;
  console.warn("deepseek_call_debug", summary);
}

async function callDeepSeek({ prompt, image, step, maxOutputTokens, modelConfig, modelRuntimeConfig, visionObservationText }) {
  if (step === "vision" || image || containsImagePayload(prompt)) {
    throw new Error("deepseek_received_image_input");
  }
  if (!String(visionObservationText || "").trim()) {
    throw new Error("missing_vision_observation_text");
  }

  const { apiKey, requestUrl, model } = assertProviderReady("deepseek", step, modelConfig, modelRuntimeConfig);
  const response = await fetch(requestUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: TEXT_ANALYSIS_SYSTEM_PROMPT,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: maxOutputTokens,
      temperature: 0.7,
    }),
  });

  const responseText = await response.text();
  let data = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new Error("deepseek_response_invalid_json");
  }
  if (!response.ok) {
    throw new Error(data.error?.message || `${providerConfig("deepseek").name} 调用失败`);
  }
  return extractChatCompletionText(data);
}

async function callDeepSeekText({ prompt, image, step, maxOutputTokens, modelConfig, modelRuntimeConfig, visionObservationText }) {
  if (step === "vision" || image || containsImagePayload(prompt)) {
    throw new Error("deepseek_received_image_input");
  }
  if (!String(visionObservationText || "").trim()) {
    throw new Error("missing_vision_observation_text");
  }

  const { apiKey, requestUrl, model, stage } = assertProviderReady("deepseek", step, modelConfig, modelRuntimeConfig);
  const response = await fetch(requestUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: TEXT_ANALYSIS_SYSTEM_PROMPT,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: maxOutputTokens,
      temperature: 0.7,
    }),
  });

  const responseText = await response.text();
  let data = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new Error("deepseek_response_invalid_json");
  }
  if (!response.ok) {
    const summary = summarizeDeepSeekError(data, `${providerConfig("deepseek").name} 调用失败`);
    logDeepSeekDebug({
      pipelineMode: modelConfig?.pipelineMode || "single",
      visionProvider: modelConfig?.visionProvider || "",
      textProvider: modelConfig?.textProvider || "",
      hasVisionObservationText: Boolean(String(visionObservationText || "").trim()),
      model: stage.model,
      baseUrlHost: stage.baseUrlHost,
      configSource: `${stage.settingsSource}/${stage.baseUrlSource}`,
      status: response.status,
      errorCode: summary.code,
      errorSummary: summary.message,
    });
    const error = new Error(summary.code ? `deepseek_http_${response.status}:${summary.code}:${summary.message}` : `deepseek_http_${response.status}:${summary.message}`);
    error.httpStatus = response.status;
    error.provider = "deepseek";
    error.model = stage.model;
    error.baseUrlHost = stage.baseUrlHost;
    error.configSource = `${stage.settingsSource}/${stage.baseUrlSource}`;
    throw error;
  }
  return extractChatCompletionText(data);
}

async function callModel({ provider, prompt, image, step, maxOutputTokens, modelConfig, modelRuntimeConfig, visionObservationText }) {
  if (provider === "openai") {
    return callOpenAI({ prompt, image, step, maxOutputTokens, modelConfig, modelRuntimeConfig });
  }
  if (provider === "deepseek") {
    return callDeepSeekText({ prompt, image, step, maxOutputTokens, modelConfig, modelRuntimeConfig, visionObservationText });
  }
  if (provider === "qwen") {
    if (step !== "vision") {
      const error = new Error("qwen_provider_not_available");
      error.provider = "qwen";
      throw error;
    }
    const observation = await generateQwenVisionAnalysis({
      image,
      modelConfig,
      runtimeStage: modelRuntimeConfig.vision,
    });
    return JSON.stringify(observation, null, 2);
  }
  assertProviderReady(provider, step, modelConfig, modelRuntimeConfig);
  throw new Error(`${providerConfig(provider).name} 适配器已预留，但尚未实现请求格式。`);
}

function buildObjectiveObservationPrompt() {
  return `你是一名谨慎的视觉观察助理。请只根据上传的房树人图画生成“客观画面观察记录”。

要求：
1. 只描述画面中明确可见的内容，不做心理解释，不做诊断，不猜测家庭关系或人格特征。
2. 观察房子、树木、人物是否出现，分别描述位置、大小、比例、线条、完整性、细节、留白、涂抹、遮挡、重复、夸张或缺失。
3. 描述三者之间的大致位置关系、画面布局、空间使用和整体视觉氛围。
4. 如果看不清某处，请写“该处不够清晰，需结合原图或访谈确认”，不要编造。
5. 输出 Markdown，标题为“# 客观画面观察记录”。`;
}

function isDialogueMode(profile) {
  return normalizeContentType(profile) === CONTENT_TYPES.dialogue;
}

function modeText(profile) {
  if (isDialogueMode(profile)) {
    return "心灵对话：温暖、敏锐、文学性较强，适合深入理解作画者的内心体验。请写成 2000-3500 字左右的心理信件，不要写成表格式测评报告。";
  }
  return "专业观察报告：结构规范、谨慎细致，适合学校心理教师个案研讨、访谈准备和辅导记录。请保持原有专业结构和风险提示，生成较完整的专业观察报告，不要过度简写。";
}

function buildDialoguePrompt(profile, observationRecord) {
  return `你是一位温暖、敏锐、富有经验的心理咨询师。你不是在写趣味测试，也不是在写医学诊断，而是在写一封温暖、敏锐、深入的心理对话文本。

请认真凝视这幅房树人图画，结合教师填写的背景资料，尝试进入作画者的内心世界。你的语言要像一位知心姐姐、亲切友善而又有洞察力的咨询师，写给作画者或教师的一封心理信件。

重要定位：
- 这不是心理诊断，不是医学诊断，也不是治疗建议。
- 这是基于图画和背景资料生成的心理观察与陪伴性推测。
- 可以比专业观察报告更细腻地呈现待验证假设，但必须保留边界、替代解释和可被推翻的空间。
- 文字要温柔、细腻、有文学性、有共情力，但不能脱离画面证据。

报告模式：${modeText(profile)}

第一步视觉模型生成的完整结构化分析资料包（包含客观观察、强制复核、显著特征、待验证候选假设、替代解释、证伪信息、心理资源、追问和安全标记）：
${observationRecord}

使用资料包时必须遵守：hypothesis_candidates 不是事实；low confidence 视觉判断不得成为心理解释依据；不得省略 alternative_explanations 和 disconfirming_information 所表达的不确定性；不得假装 Inquiry 已完成。

${FACT_FIDELITY_RULES}

教师填写的背景资料：
- 学生编号或化名：${profile.studentAlias || "未填写"}
- 年龄段：${profile.ageRange || "未填写"}
- 性别：${profile.gender || "未填写"}
- 年级：${profile.grade || "未填写"}
- 绘画情境：${profile.drawingContext || "未填写"}
- 学生近期主要表现：${profile.recentBehavior || "未填写"}
- 教师关注的问题：${profile.teacherConcern || "未填写"}
- 学生本人描述或讲述内容：${profile.studentNarrative || "未填写"}
- 是否存在明显风险信息：${profile.riskInfo || "未填写"}
- 教师希望生成的内容：${normalizeContentType(profile)}

心灵对话写作原则：
1. 先看见画面，再走入内心。每一个较重要的推测，都要来自画面中的某个细节或教师提供的背景资料，不要凭空发挥。
2. 允许呈现有探索价值的心理假设，但必须写成待验证理解，并同时说明替代解释与需要进一步了解的信息。可以写“这一线索可能与紧张体验有关，也可能来自绘画习惯或当时情境，建议通过沟通确认”。
3. 必须保留边界。请自然使用“也许”“可能”“似乎”“我会倾向于理解为”“这需要进一步访谈确认”“这不是结论，而是一个值得温柔核对的线索”等表达。
4. 对画面与背景共同支持且置信度足够的线索，可以提出值得关注的主题，但不得把安全感、情绪、人际、自我感或压力主题写成已证实事实；必须说明证据、替代解释和建议核对的问题。
5. 不能写成诊断。禁止使用“你有抑郁症”“你人格有问题”“你家庭一定不幸福”“你心理异常”“你有严重创伤”等绝对化、标签化、恐吓式表达。
6. 不要空泛鼓励。不要只写“你很好”“你要相信自己”这类空话，除非能从具体画面或资料中看到依据。
7. 要能写出画面背后可能隐藏的情绪、关系、渴望、防御、孤独、压力、矛盾或求助信号。
8. 建议要具体、温暖、可执行。可以建议从画面故事入手谈话、补画“我希望的家/我希望的自己”、记录一个稍微放松的时刻、找安全的人说出一件最近难受的小事等。
9. 若背景资料显示自伤、自杀、长期失眠、明显拒学、严重冲突或暴力风险，要冷静建议及时寻求学校心理教师、监护人和专业心理咨询/医疗资源，不要制造恐慌。

请使用 Markdown 输出，不要输出 JSON。请写成一封有小标题的心理信件，字数控制在 2000-3500 字左右。结构如下：

# 心灵对话

## 1. 开头：我看见了这幅画，也想轻轻走近你
用 1-2 段温暖开头，说明这不是诊断，而是一种陪伴式理解。

## 2. 画面给我的第一感受
描写整体画面氛围，语言可以有文学性，但必须基于视觉证据。

## 3. 房子：你心中关于安全、归属与边界的故事
结合房子的大小、位置、门窗、路径、开放性、封闭性等，进行较深入的理解。重要推测必须有画面依据，并保留“也可能只是绘画习惯或构图选择”的边界。

## 4. 树木：你正在怎样生长，又怎样承受风雨
结合树干、树冠、根、枝叶、倾斜、生命力等，理解成长感、压力承受、能量状态。

## 5. 人物：你如何把自己放在这个世界里
结合人物大小、位置、动作、表情、手脚、完整性、朝向等，理解自我感、行动感、表达方式和关系期待。

## 6. 也许真正值得被看见的是……
这是核心部分。请更深入地指出画面和资料中可能透露出的内在问题、情绪困境或未被表达的需要。表达要真诚、敏锐、温柔，可以一针见血，但必须保留推测边界。

## 7. 给你的温柔而明确的建议
给出 5-8 条具体建议。建议要有针对性，不要泛泛而谈。

## 8. 如果你是老师，可以这样继续靠近
给教师 5-8 条后续访谈或陪伴建议。要具体说明可以从哪个问题开始问、哪些话不要急着说、如何降低学生防御。

## 9. 结尾：愿你被看见，也慢慢看见自己
用一段有力量但不过度煽情的结尾。

## 10. 声明
必须写明：以上内容是基于图画和背景资料生成的心理观察与陪伴性推测，不构成心理诊断。若存在自伤、自杀、严重冲突、长期失眠、明显拒学或其他危机风险，应及时联系学校心理教师、监护人和专业心理咨询/医疗资源。`;
}

function buildProfessionalReportPrompt(profile, observationRecord) {
  const plan = selectedPlan(profile);
  const contentType = normalizeContentType(profile);
  const isObservationReport = contentType === CONTENT_TYPES.professional;
  const deepLengthRules = isObservationReport
    ? `
重点篇幅要求：
- 【画面客观描述】不少于 300 字，只描述，不解释。
- 【关于“房子”的观察线索】不少于 350 字，包含 2-4 个后续访谈问题。
- 【关于“树木”的观察线索】不少于 350 字，包含 2-4 个后续访谈问题。
- 【关于“人物”的观察线索】不少于 350 字，包含 2-4 个后续访谈问题。
- 【整体构图与情绪氛围】不少于 300 字，说明视觉感受来自哪些画面因素。
- 【结合背景资料的可能心理线索】不少于 500 字，提出 4-6 条线索，每条包括画面依据、背景资料依据、可能理解、需要进一步确认的问题。
- 【保护性资源与积极因素】不少于 250 字。
- 【建议访谈问题】生成 12-16 个问题，并按画面本身、情绪体验、家庭与支持系统、学校人际学习、风险与求助分组。
- 【教师辅导建议】不少于 400 字，分为一对一谈话、班主任日常观察、家校沟通、必要时转介建议。`
    : `
请根据当前生成目标适当调整篇幅，但仍要保持具体、有画面依据、有访谈启发，不要只给模板化条目。`;

  return `你是一位有经验的学校心理教师，正在为同事撰写一份内部使用的房树人绘画观察辅助材料。请以“专业、谨慎、细腻、有心理理解深度、有访谈启发性”的方式写作。

重要定位：
- 这不是趣味测试，不是心理诊断，不是医学诊断，也不是治疗建议。
- 目标是帮助学校心理教师形成初步个案理解、访谈假设、辅导记录和后续跟进思路。
- 请像一位有经验的学校心理教师写给同事的观察记录，有温度、有分寸、有理解力，避免机械填表感。

本次生成目标：${contentType}
文档标题：${plan.title}
报告模式：${modeText(profile)}

第一步视觉模型生成的完整结构化分析资料包（包含客观观察、强制复核、显著特征、待验证候选假设、替代解释、证伪信息、心理资源、追问和安全标记）：
${observationRecord}

使用资料包时必须遵守：hypothesis_candidates 不是事实；high confidence 可进入候选主题，medium 只能作为次级不确定线索，low 不得成为心理解释依据；不得省略 alternative_explanations、supporting_information_needed 和 disconfirming_information；不得假装 Inquiry 已完成。

${FACT_FIDELITY_RULES}

教师填写的背景资料：
- 学生编号或化名：${profile.studentAlias || "未填写"}
- 年龄段：${profile.ageRange || "未填写"}
- 性别：${profile.gender || "未填写"}
- 年级：${profile.grade || "未填写"}
- 绘画情境：${profile.drawingContext || "未填写"}
- 学生近期主要表现：${profile.recentBehavior || "未填写"}
- 教师关注的问题：${profile.teacherConcern || "未填写"}
- 学生本人描述或讲述内容：${profile.studentNarrative || "未填写"}
- 是否存在明显风险信息：${profile.riskInfo || "未填写"}
- 当前登录教师账号：${profile.teacherAccount || "未记录"}

深度分析原则：
1. 每一个解释都必须先回到画面证据。不要直接解释心理意义。请自然使用类似表达：“我在画面中看到……”“这一点可能提示……”“也可能只是……”“建议在访谈中进一步确认……”
2. 每个重要观察至少给出两种可能解释。
3. 增加深层理解，而不是只列条目。请结合画面、学生资料、教师关注问题，形成温和的心理假设。
4. 可以进行诚恳的心理学推测，但必须保持谨慎。
5. 报告中自然区分三种推测强度：画面明确可见、初步观察线索、需要访谈确认。
6. 禁止机械化空话。不要写空泛模板句，除非有具体画面依据。
7. 每个重要判断都要回答：我是从画面哪里看出来的？还有没有其他可能？下一步该问什么？
8. 风险提示要分层表达。若出现自伤、自杀、严重暴力等风险信息，冷静明确地建议启动学校危机干预流程，联系监护人和专业人员；不要恐吓，不要制造恐慌。

请使用 Markdown 输出。不要输出 JSON。请用二级标题组织文档，并按以下结构写：
${plan.sections.map((section, index) => `${index + 1}. ${section}`).join("\n")}
${deepLengthRules}

最后必须写明：本内容由 AI 根据图像和文字资料生成，仅用于学校心理教育、绘画表达观察、访谈准备或辅导记录整理，不构成心理诊断、医学诊断或治疗建议。房树人绘画结果不能单独作为判断学生心理状态的依据。使用者应结合访谈、量表、日常观察、家长沟通及专业评估综合判断。若学生存在自伤、自杀、严重暴力或其他危机风险，应立即启动学校危机干预流程并联系专业人员。`;
}

function documentTitleFromMarkdown(markdown, fallback) {
  const firstHeading = String(markdown || "").split(/\r?\n/).find((line) => line.startsWith("# "));
  return firstHeading ? firstHeading.replace(/^#\s+/, "").trim() : fallback;
}

async function generateTeacherReport({ image, profile, modelConfig, modelRuntimeConfig }) {
  const runtime = modelRuntimeConfig || resolveModelRuntimeConfig(modelConfig || {}, {
    source: modelConfig?.source || "default",
  });
  const visionProvider = runtime.vision.provider;
  const textProvider = runtime.text.provider;
  const contentType = normalizeContentType(profile);
  const plan = selectedPlan(profile);

  let observationRecord;
  try {
    observationRecord = await callModel({
      provider: visionProvider,
      step: "vision",
      image,
      prompt: buildObjectiveObservationPrompt(),
      maxOutputTokens: 2200,
      modelConfig,
      modelRuntimeConfig: runtime,
    });
  } catch (error) {
    error.modelStage = "vision";
    error.provider = error.provider || visionProvider;
    throw error;
  }

  const textPrompt = isDialogueMode(profile)
    ? buildDialoguePrompt(profile, observationRecord)
    : buildProfessionalReportPrompt(profile, observationRecord);

  let markdown;
  try {
    markdown = await callModel({
      provider: textProvider,
      step: "text",
      prompt: textPrompt,
      maxOutputTokens: isDialogueMode(profile) ? 6500 : 8000,
      modelConfig,
      modelRuntimeConfig: runtime,
      visionObservationText: observationRecord,
    });
  } catch (error) {
    error.modelStage = "text";
    error.provider = error.provider || textProvider;
    throw error;
  }

  return {
    documentTitle: documentTitleFromMarkdown(markdown, contentType === CONTENT_TYPES.dialogue ? "心灵对话" : plan.title),
    markdown,
    observationRecord,
    providers: {
      vision: visionProvider,
      text: textProvider,
    },
  };
}

module.exports = {
  PROVIDERS,
  buildDialoguePrompt,
  buildProfessionalReportPrompt,
  documentTitleFromMarkdown,
  isDialogueMode,
  normalizeContentType,
  selectedPlan,
  generateTeacherReport,
};
