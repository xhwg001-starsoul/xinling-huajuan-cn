const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const appSource = fs.readFileSync(path.resolve(__dirname, "..", "app.js"), "utf8");

assert.match(appSource, /function setReportStatus\(status\)[\s\S]*button\.disabled = disabled/);
assert.match(appSource, /if \(disabled\) \{[\s\S]*lastReportText = "";[\s\S]*lastReportMeta = null;/);
assert.match(appSource, /function buildReportExportData\(\) \{[\s\S]*reportStatus !== "ready"/);
assert.match(appSource, /model_call_failed:report_fact_conflict[\s\S]*setReportStatus\("conflict"\)/);
assert.match(appSource, /copyReportButton\.addEventListener[\s\S]*reportStatus !== "ready"/);
assert.match(appSource, /printReportButton\.addEventListener[\s\S]*reportStatus === "ready"/);
console.log("ok - blocked reports cannot reuse, copy, print, or export prior report content");
