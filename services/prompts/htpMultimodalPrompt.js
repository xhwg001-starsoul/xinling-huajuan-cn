const { HTP_VISUAL_HYPOTHESIS_V2 } = require("./htpVisualPrompts");
const {
  buildDialoguePrompt,
  buildProfessionalReportPrompt,
  isDialogueMode,
} = require("../../model-adapters");
const { approvedKnowledgeContext } = require("../htpVisualAnalysis");

const HTP_MULTIMODAL_FULL_V1 = "HTP_MULTIMODAL_FULL_V1";

function reportRules(profile) {
  const placeholder = "<本次响应中的 analysisPacket>";
  const rules = isDialogueMode(profile)
    ? buildDialoguePrompt(profile, placeholder)
    : buildProfessionalReportPrompt(profile, placeholder);
  return rules
    .replace(/请使用 Markdown 输出，不要输出 JSON。/g, "reportMarkdown 字段必须使用 Markdown 编写。")
    .replace(/请使用 Markdown 输出。不要输出 JSON。/g, "reportMarkdown 字段必须使用 Markdown 编写。");
}

function buildHtpMultimodalFullPrompt({ profile = {}, knowledgeContext = [] } = {}) {
  const approvedCards = approvedKnowledgeContext(knowledgeContext);
  const visualRules = HTP_VISUAL_HYPOTHESIS_V2.replace(
    /<APPROVED_KNOWLEDGE_CONTEXT>[\s\S]*?<\/APPROVED_KNOWLEDGE_CONTEXT>/,
    `<APPROVED_KNOWLEDGE_CONTEXT>\n${JSON.stringify(approvedCards)}\n</APPROVED_KNOWLEDGE_CONTEXT>`,
  );
  return `${visualRules}

## 单模型完整分析补充要求

你必须在同一次多模态调用中直接核对原图、形成 analysisPacket，并生成最终报告。不得假装看不到原图，也不得把视觉任务交给另一个模型。

烟囱与烟必须分别记录 chimney_present、smoke_present、smoke_plume_count、confidence。树干必须分别记录 absolute_trunk_width 与 crown_to_trunk_ratio，不得因树冠很大而把粗树干写成细树干。

以下是现有正式报告的完整写作规则。请完整遵守，并把最终 Markdown 放入 reportMarkdown 字段：

${reportRules(profile)}

最终只输出一个合法 JSON 对象，不要代码围栏，不要额外说明：
{
  "promptVersion": "${HTP_MULTIMODAL_FULL_V1}",
  "analysisPacket": { "prompt_version": "HTP_VISUAL_HYPOTHESIS_V2", "image_quality": {}, "visual_observations": {}, "verification_checks": {}, "salient_features": [], "hypothesis_candidates": [], "strengths_and_resources": [], "priority_questions": [], "safety": {}, "handoff_summary": "" },
  "reportMarkdown": "完整报告 Markdown"
}

priority_questions 每项必须保留 question_id、question、purpose、related_hypothesis_ids。所有换行和引号必须正确 JSON 转义。`;
}

module.exports = {
  HTP_MULTIMODAL_FULL_V1,
  buildHtpMultimodalFullPrompt,
};
