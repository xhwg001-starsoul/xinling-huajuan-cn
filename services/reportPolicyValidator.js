function compact(value) {
  return String(value || "").replace(/\s+/g, "");
}

function isNegated(text, index) {
  const prefix = text.slice(Math.max(0, index - 28), index);
  return /(?:不能|不可|不应|不要|并非|不是|无法|不足以|不得|避免).{0,20}$/.test(prefix);
}

function affirmedMatch(text, pattern) {
  const match = pattern.exec(text);
  return match && !isNegated(text, match.index) ? match[0] : "";
}

function validateReportKnowledgePolicy(caseAnalysisCore, reportMarkdown) {
  const report = compact(reportMarkdown);
  const cards = caseAnalysisCore?.knowledge?.selectedContext || [];
  const restrictions = cards.flatMap((card) => card.do_not_infer || card.doNotInfer || []);
  const conflicts = [];
  if (restrictions.some((item) => /创伤|虐待/.test(item))) {
    const matched = affirmedMatch(report, /(?:树疤|伤痕|洞穴|绘画特征).{0,18}(?:证明|代表|说明|表明|意味着).{0,18}(?:创伤|虐待|受过伤)/);
    if (matched) conflicts.push({ code: "restricted_trauma_inference", matchedText: matched.slice(0, 80) });
  }
  if (restrictions.some((item) => /诊断|心理或精神疾病|抑郁症|焦虑障碍/.test(item))) {
    const matched = affirmedMatch(report, /(?:可以|能够|足以|由此).{0,12}(?:诊断|确定).{0,12}(?:抑郁|焦虑障碍|心理疾病|精神疾病)/);
    if (matched) conflicts.push({ code: "restricted_diagnosis_inference", matchedText: matched.slice(0, 80) });
  }
  return { status: conflicts.length ? "conflict" : "pass", conflicts };
}

function assertReportKnowledgePolicy(caseAnalysisCore, reportMarkdown) {
  const result = validateReportKnowledgePolicy(caseAnalysisCore, reportMarkdown);
  if (result.status === "conflict") {
    const error = new Error("report_knowledge_policy_conflict");
    error.errorCode = "report_knowledge_policy_conflict";
    error.policyConsistency = result;
    throw error;
  }
  return result;
}

module.exports = { assertReportKnowledgePolicy, validateReportKnowledgePolicy };
