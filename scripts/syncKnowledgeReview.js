const path = require("node:path");
const ExcelJS = require("exceljs");
const { writeRuntimeKnowledgeBase } = require("../services/knowledgeReviewSyncService");

function option(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find((item) => item.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

async function readReviewRows(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("knowledge_review_sheet_missing");
  const headers = sheet.getRow(1).values.slice(1).map((value) => String(value || "").trim());
  return sheet.getRows(2, Math.max(0, sheet.rowCount - 1)).filter((row) => row.values.some((value) => value !== null && value !== undefined && value !== "")).map((row) => {
    const values = row.values.slice(1);
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

async function main() {
  const root = path.resolve(__dirname, "..");
  const reviewPath = path.resolve(option("review", path.join(root, "references", "HTP", "review_queue_v0.2.xlsx")));
  const cardsPath = path.resolve(option("cards", path.join(root, "references", "HTP", "knowledge_cards_v0.2.jsonl")));
  const sourcesPath = path.resolve(option("sources", path.join(root, "references", "HTP", "sources_v0.2.json")));
  const outputDirectory = path.resolve(option("output", path.join(root, "knowledge-base")));
  const reviewRows = await readReviewRows(reviewPath);
  const result = writeRuntimeKnowledgeBase({ reviewRows, cardsPath, sourcesPath, outputDirectory });
  console.log(JSON.stringify({
    ok: true,
    cardCount: result.cardCount,
    uniqueCardCount: result.uniqueCardCount,
    approvedCardCount: result.approvedCardCount,
    professionalContentUnchanged: result.professionalContentUnchanged,
    professionalContentHashBefore: result.professionalContentHashBefore,
    professionalContentHashAfter: result.professionalContentHashAfter,
    backupPath: result.backupPath,
    outputDirectory: result.outputDirectory,
  }));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: String(error?.code || error?.message || "knowledge_review_sync_failed"), details: error?.details || undefined }));
  process.exitCode = 1;
});
