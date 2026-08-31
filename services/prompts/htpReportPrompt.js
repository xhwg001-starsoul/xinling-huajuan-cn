const { buildDialoguePrompt, buildProfessionalReportPrompt, isDialogueMode, normalizeContentType } = require("../../model-adapters");
const { buildReportInputView } = require("../reportInputView");

const HTP_REPORT_FROM_CASE_CORE_V1 = "HTP_REPORT_FROM_CASE_CORE_V1";

function buildReportFromCaseCorePrompt({ caseAnalysisCore, profile = {}, outputType, compactMode = false }) {
  const effectiveProfile = {
    ...profile,
    contentType: normalizeContentType({ ...profile, contentType: outputType }),
    splitReportLengthMode: compactMode ? "fallback" : "balanced",
  };
  const coreText = JSON.stringify(buildReportInputView(caseAnalysisCore, { compactMode }));
  const reportPrompt = isDialogueMode(effectiveProfile)
    ? buildDialoguePrompt(effectiveProfile, coreText)
    : buildProfessionalReportPrompt(effectiveProfile, coreText);
  const professionalLengthRule = effectiveProfile.contentType === "教师专业观察报告"
    ? compactMode
      ? "\n本次为完整性优先的紧凑重试：保留全部必要章节，每节简洁完整，正文建议 3500-5000 个中文字符；不得在句中或章节中途结束。"
      : "\n本报告正文建议控制在 4200-6000 个中文字符，软上限 6500；各章节均需完整，但避免重复免责声明、重复画面描述和同义扩写。"
    : "";
  return `${reportPrompt}

## 正式知识库约束

你收到的是经过事实标准化和知识库筛选后的 caseAnalysisCore，不是原图。不得声称重新看过图片。
knowledge.cards 中的 evidenceLevel、policy、userFacingAllowed、requiresInquiry，以及 knowledge.globalDoNotInfer 和 globalAlternativeExplanations 必须实际约束最终文本。
标记为 restricted、user_facing_allowed=false 或 do_not_infer 的内容不得被写成确定心理事实。D/E 级依据只能形成探索性叙事，并同时保留替代解释和允许本人推翻的空间。
心灵对话仍应温暖、有陪伴感和适度文学性；教师专业报告则应清楚区分画面事实、知识库支持方向、模型通识假设、待访谈确认和不能推断的内容。

只输出本次选择的“${effectiveProfile.contentType}”Markdown，不要 JSON，不要生成其他五种内容。${professionalLengthRule}`;
}

module.exports = { HTP_REPORT_FROM_CASE_CORE_V1, buildReportFromCaseCorePrompt };
