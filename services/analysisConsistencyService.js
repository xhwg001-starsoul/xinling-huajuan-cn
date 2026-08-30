const { buildFactSnapshot } = require("./visualFactSnapshot");

function compactReport(reportMarkdown) {
  return String(reportMarkdown || "").replace(/\s+/g, "");
}

function phraseIsNegated(text, index) {
  const prefix = text.slice(Math.max(0, index - 24), index);
  return /(?:并不|并非|并不是|不是|不算|绝非|不能|不可|不应|不要|避免|切勿|勿).{0,18}$/.test(prefix);
}

function findAffirmedPhrase(text, phrases) {
  for (const phrase of phrases) {
    let from = 0;
    while (from < text.length) {
      const index = text.indexOf(phrase, from);
      if (index < 0) break;
      if (!phraseIsNegated(text, index)) return phrase;
      from = index + phrase.length;
    }
  }
  return "";
}

function conflict(code, fact, matchedText) {
  return { code, fact, matchedText };
}

function evaluateReportFactConsistency(factSnapshot, reportMarkdown) {
  const report = compactReport(reportMarkdown);
  const facts = factSnapshot || {};
  const conflicts = [];
  const smokeNo = ["烟囱没有烟", "烟囱上没有烟", "烟囱不冒烟", "没有炊烟", "炉火已经熄灭", "炉火已熄"];
  const smokeYes = ["烟囱正在冒烟", "烟囱冒烟", "正在冒烟", "炊烟正在升起", "炊烟升起"];
  const thinTrunk = ["树干很细", "树干细长", "细长的树干", "树干细弱", "细弱树干", "纤细树干", "纤细的树干", "非常窄的树干", "树干非常窄", "树干窄小"];
  const thickTrunk = ["树干粗壮", "粗壮的树干", "树干宽厚", "树干粗大", "树干很粗"];

  if (facts.smoke?.confidence !== "low") {
    const noPhrase = findAffirmedPhrase(report, smokeNo);
    const yesPhrase = findAffirmedPhrase(report, smokeYes);
    if (facts.smoke.present === "uncertain") {
      if (noPhrase) conflicts.push(conflict("smoke_uncertain_changed_to_no", "smoke.present", noPhrase));
      if (yesPhrase) conflicts.push(conflict("smoke_uncertain_changed_to_yes", "smoke.present", yesPhrase));
    } else if (facts.smoke.present === "yes" && noPhrase) {
      conflicts.push(conflict("smoke_yes_changed_to_no", "smoke.present", noPhrase));
    } else if (facts.smoke.present === "no" && yesPhrase) {
      conflicts.push(conflict("smoke_no_changed_to_yes", "smoke.present", yesPhrase));
    }
  }

  if (facts.treeTrunk?.confidence !== "low") {
    const thinPhrase = findAffirmedPhrase(report, thinTrunk);
    const thickPhrase = findAffirmedPhrase(report, thickTrunk);
    if (["medium", "thick"].includes(facts.treeTrunk.absoluteWidth) && thinPhrase) {
      conflicts.push(conflict("tree_trunk_width_changed_to_thin", "treeTrunk.absoluteWidth", thinPhrase));
    }
    if (facts.treeTrunk.absoluteWidth === "thin" && thickPhrase) {
      conflicts.push(conflict("tree_trunk_width_changed_to_thick", "treeTrunk.absoluteWidth", thickPhrase));
    }
  }

  if (facts.treeScars?.confidence !== "low" && facts.treeScars.present === "yes" && Number(facts.treeScars.count) > 0) {
    const phrase = findAffirmedPhrase(report, ["树干光滑无明显痕迹", "树干没有明显标记", "树干无明显标记", "没有明显伤痕", "没有树疤", "无树疤"]);
    if (phrase) conflicts.push(conflict("tree_scars_removed", "treeScars", phrase));
  }
  if (facts.roots?.confidence === "high" && facts.roots.present === "no") {
    const phrase = findAffirmedPhrase(report, ["根系明显", "根系发达", "明显的根扎入地面", "根深深扎入地面"]);
    if (phrase) conflicts.push(conflict("roots_no_changed_to_yes", "roots.present", phrase));
  }
  if (facts.groundLine?.confidence === "high" && facts.groundLine.present === "no") {
    const phrase = findAffirmedPhrase(report, ["地面线清晰", "清晰的地面线", "明确的地面线"]);
    if (phrase) conflicts.push(conflict("ground_line_no_changed_to_yes", "groundLine.present", phrase));
  }
  if (facts.house?.confidence === "high" && facts.house.doorPresent === "yes") {
    const phrase = findAffirmedPhrase(report, ["房屋没有门", "房子没有门", "房屋无门", "未画门"]);
    if (phrase) conflicts.push(conflict("door_yes_changed_to_no", "house.doorPresent", phrase));
  }
  if (facts.house?.confidence === "high" && Number(facts.house.windowCount) > 0) {
    const phrase = findAffirmedPhrase(report, ["没有窗户", "房屋无窗", "房子无窗", "未画窗户"]);
    if (phrase) conflicts.push(conflict("window_count_changed_to_zero", "house.windowCount", phrase));
  }
  return { status: conflicts.length ? "conflict" : "pass", conflicts };
}

function assertReportFactConsistency(analysisPacket, reportMarkdown) {
  const factSnapshot = buildFactSnapshot(analysisPacket);
  const result = evaluateReportFactConsistency(factSnapshot, reportMarkdown);
  if (result.status === "conflict") {
    const error = new Error("report_fact_conflict");
    error.errorCode = "report_fact_conflict";
    error.factSnapshot = factSnapshot;
    error.factConsistency = result;
    error.analysisPacket = analysisPacket;
    throw error;
  }
  return { factSnapshot, factConsistency: result };
}

module.exports = {
  assertReportFactConsistency,
  evaluateReportFactConsistency,
  findAffirmedPhrase,
};
