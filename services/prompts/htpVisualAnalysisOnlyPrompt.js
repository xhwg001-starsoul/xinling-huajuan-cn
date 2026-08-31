const { HTP_VISUAL_HYPOTHESIS_V2 } = require("./htpVisualPrompts");

const HTP_VISUAL_ANALYSIS_ONLY_V1 = "HTP_VISUAL_ANALYSIS_ONLY_V1";

function buildHtpVisualAnalysisOnlyPrompt() {
  const visualRules = HTP_VISUAL_HYPOTHESIS_V2.replace(
    /<APPROVED_KNOWLEDGE_CONTEXT>[\s\S]*?<\/APPROVED_KNOWLEDGE_CONTEXT>/,
    "<APPROVED_KNOWLEDGE_CONTEXT>\n[]\n</APPROVED_KNOWLEDGE_CONTEXT>",
  );
  return `${visualRules}

## 本阶段任务边界

本阶段只负责充分、稳定、可复核地看清图像，并形成结构化 analysisPacket。不得生成心灵对话、教师专业报告、家校沟通建议、辅导记录或长篇文学性解释。

可以保留克制、可推翻的 hypothesis_candidates，但必须给出替代解释、支持信息需求和证伪信息。视觉不清晰时必须降低 confidence 或标记需人工确认。

最终只输出一个合法 JSON 对象，不要代码围栏，不要额外说明：
{
  "promptVersion": "${HTP_VISUAL_ANALYSIS_ONLY_V1}",
  "analysisPacket": {
    "prompt_version": "HTP_VISUAL_HYPOTHESIS_V2",
    "image_quality": {},
    "visual_observations": {},
    "verification_checks": {},
    "salient_features": [],
    "hypothesis_candidates": [],
    "strengths_and_resources": [],
    "priority_questions": [],
    "safety": {},
    "handoff_summary": ""
  }
}`;
}

module.exports = { HTP_VISUAL_ANALYSIS_ONLY_V1, buildHtpVisualAnalysisOnlyPrompt };
