// 模型适配器层：把具体模型供应商封装在后端，方便以后在 OpenAI、Qwen、豆包、智谱、讯飞、StepFun 等模型之间切换。
// 所有 API Key 只能从后端环境变量读取，不能写进前端 HTML、JS 或可公开访问的配置文件。

const PROVIDERS = {
  openai: {
    name: "OpenAI",
    apiKeyEnv: "OPENAI_API_KEY",
    baseUrlEnv: "OPENAI_BASE_URL",
    defaultBaseUrl: "https://api.openai.com/v1/responses",
    visionModelEnv: "OPENAI_VISION_MODEL",
    textModelEnv: "OPENAI_TEXT_MODEL",
    defaultVisionModel: "gpt-4.1",
    defaultTextModel: "gpt-4.1",
    implemented: true,
  },
  qwen: {
    name: "Qwen",
    apiKeyEnv: "QWEN_API_KEY",
    baseUrlEnv: "QWEN_BASE_URL",
    visionModelEnv: "QWEN_VISION_MODEL",
    textModelEnv: "QWEN_TEXT_MODEL",
    defaultVisionModel: "qwen-vl-plus",
    defaultTextModel: "qwen-plus",
    implemented: false,
  },
  doubao: {
    name: "Doubao",
    apiKeyEnv: "DOUBAO_API_KEY",
    baseUrlEnv: "DOUBAO_BASE_URL",
    visionModelEnv: "DOUBAO_VISION_MODEL",
    textModelEnv: "DOUBAO_TEXT_MODEL",
    defaultVisionModel: "doubao-vision-placeholder",
    defaultTextModel: "doubao-text-placeholder",
    implemented: false,
  },
  glm: {
    name: "GLM",
    apiKeyEnv: "GLM_API_KEY",
    baseUrlEnv: "GLM_BASE_URL",
    visionModelEnv: "GLM_VISION_MODEL",
    textModelEnv: "GLM_TEXT_MODEL",
    defaultVisionModel: "glm-4v-placeholder",
    defaultTextModel: "glm-4-placeholder",
    implemented: false,
  },
  xunfei: {
    name: "Xunfei",
    apiKeyEnv: "XUNFEI_API_KEY",
    baseUrlEnv: "XUNFEI_BASE_URL",
    visionModelEnv: "XUNFEI_VISION_MODEL",
    textModelEnv: "XUNFEI_TEXT_MODEL",
    defaultVisionModel: "xunfei-vision-placeholder",
    defaultTextModel: "xunfei-text-placeholder",
    implemented: false,
  },
  stepfun: {
    name: "StepFun",
    apiKeyEnv: "STEPFUN_API_KEY",
    baseUrlEnv: "STEPFUN_BASE_URL",
    visionModelEnv: "STEPFUN_VISION_MODEL",
    textModelEnv: "STEPFUN_TEXT_MODEL",
    defaultVisionModel: "step-vision-placeholder",
    defaultTextModel: "step-text-placeholder",
    implemented: false,
  },
};

const documentPlans = {
  "生成初步观察报告": {
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
  "生成访谈问题": {
    title: "房树人绘画访谈问题建议",
    sections: ["访谈准备摘要", "从画面进入谈话的暖场问题", "围绕房子的开放式问题", "围绕树木的开放式问题", "围绕人物的开放式问题", "结合近期表现的澄清问题", "安全感、支持资源与求助意愿问题", "风险评估相关的温和询问", "教师提问注意事项", "后续访谈记录建议", "使用限制与免责声明"],
  },
  "生成家校沟通建议": {
    title: "家校沟通建议稿",
    sections: ["沟通前信息摘要", "建议沟通目标", "与家长沟通的表达原则", "可以向家长了解的问题", "可以反馈给家长的观察内容", "家庭支持建议", "学校后续配合建议", "风险情形下的沟通提醒", "可直接参考的沟通话术", "使用限制与免责声明"],
  },
  "生成辅导记录初稿": {
    title: "学生心理辅导记录初稿",
    sections: ["基本信息", "辅导背景与资料来源", "学生近期主要表现", "学生本人描述摘要", "房树人图画客观观察摘要", "初步观察线索", "保护性因素与可用资源", "风险信息与处置建议", "本次辅导目标建议", "个别谈话过程记录初稿", "教师回应与支持策略", "家校沟通或班级观察建议", "后续跟进计划", "记录限制与免责声明"],
  },
  "其他": {
    title: "房树人绘画观察辅助文档",
    sections: ["信息摘要", "画面客观观察", "可能线索", "教师可用建议", "后续跟进", "使用限制与免责声明"],
  },
};

function selectedPlan(profile) {
  return documentPlans[profile.desiredHelp] || documentPlans["生成初步观察报告"];
}

function selectedProvider(step) {
  const key =
    step === "vision"
      ? process.env.VISION_MODEL_PROVIDER || process.env.MODEL_PROVIDER || "openai"
      : process.env.TEXT_MODEL_PROVIDER || process.env.MODEL_PROVIDER || "openai";
  return String(key).toLowerCase();
}

function providerConfig(providerKey) {
  const config = PROVIDERS[providerKey];
  if (!config) {
    throw new Error(`暂不支持的模型供应商：${providerKey}`);
  }
  return config;
}

function assertProviderReady(providerKey, step) {
  const config = providerConfig(providerKey);
  if (!config.implemented) {
    throw new Error(`${config.name} 适配器已预留配置，但当前尚未接入真实调用逻辑。请先实现该供应商的后端适配器并设置 ${config.apiKeyEnv}。`);
  }
  if (!process.env[config.apiKeyEnv]) {
    throw new Error(`还没有读取到 ${config.apiKeyEnv}。请在后端环境变量中设置该 API Key。`);
  }
  return {
    config,
    apiKey: process.env[config.apiKeyEnv],
    baseUrl: process.env[config.baseUrlEnv] || config.defaultBaseUrl,
    model:
      step === "vision"
        ? process.env[config.visionModelEnv] || process.env.OPENAI_MODEL || config.defaultVisionModel
        : process.env[config.textModelEnv] || process.env.OPENAI_MODEL || config.defaultTextModel,
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

async function callOpenAI({ prompt, image, step, maxOutputTokens }) {
  const { apiKey, baseUrl, model } = assertProviderReady("openai", step);
  const content = [{ type: "input_text", text: prompt }];
  if (image) {
    content.push({ type: "input_image", image_url: image, detail: "high" });
  }

  const response = await fetch(baseUrl, {
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

async function callModel({ provider, prompt, image, step, maxOutputTokens }) {
  if (provider === "openai") {
    return callOpenAI({ prompt, image, step, maxOutputTokens });
  }
  assertProviderReady(provider, step);
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

function modeText(profile) {
  if (profile.reportMode === "standard") {
    return "标准报告：结构清晰，适合快速了解，约 1500-2000 字。可以保持完整结构，但不要过度展开。";
  }
  return "深度报告：观察更细致，推测更充分，适合个案研讨，约 3000-4500 字。请生成较完整的深度报告，不要过度简写。";
}

function buildProfessionalReportPrompt(profile, observationRecord) {
  const plan = selectedPlan(profile);
  const isObservationReport = (profile.desiredHelp || "生成初步观察报告") === "生成初步观察报告";
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

本次生成目标：${profile.desiredHelp || "生成初步观察报告"}
文档标题：${plan.title}
报告模式：${modeText(profile)}

第一步视觉模型生成的客观画面观察记录：
${observationRecord}

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

async function generateTeacherReport({ image, profile }) {
  const visionProvider = selectedProvider("vision");
  const textProvider = selectedProvider("text");
  const plan = selectedPlan(profile);

  const observationRecord = await callModel({
    provider: visionProvider,
    step: "vision",
    image,
    prompt: buildObjectiveObservationPrompt(),
    maxOutputTokens: 2200,
  });

  const markdown = await callModel({
    provider: textProvider,
    step: "text",
    prompt: buildProfessionalReportPrompt(profile, observationRecord),
    maxOutputTokens: profile.reportMode === "standard" ? 3500 : 8000,
  });

  return {
    documentTitle: documentTitleFromMarkdown(markdown, plan.title),
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
  generateTeacherReport,
};
