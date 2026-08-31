const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const REVIEW_FIELDS = new Set(["review_status", "reviewer_decision", "reviewer_note", "reviewed_by", "reviewed_at", "review_version"]);

function syncError(code, details = {}) {
  const error = new Error(code);
  error.code = code;
  error.details = details;
  return error;
}

function idOf(value) {
  return String(value?.card_id || value?.id || "").trim();
}

function assertUniqueIds(rows, label) {
  const ids = rows.map(idOf);
  if (ids.some((id) => !id)) throw syncError(`${label}_missing_id`);
  if (new Set(ids).size !== ids.length) throw syncError(`${label}_duplicate_id`);
  return new Set(ids);
}

function withoutReviewFields(value) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !REVIEW_FIELDS.has(key)));
}

function professionalContentHash(cards) {
  return crypto.createHash("sha256")
    .update(JSON.stringify(cards.map(withoutReviewFields)))
    .digest("hex");
}

function synchronizeKnowledgeReview({ reviewRows, cards }) {
  if (!Array.isArray(reviewRows) || !Array.isArray(cards)) throw syncError("knowledge_review_input_invalid");
  const reviewIds = assertUniqueIds(reviewRows, "review");
  const cardIds = assertUniqueIds(cards, "cards");
  const reviewOnly = [...reviewIds].filter((id) => !cardIds.has(id));
  const cardsOnly = [...cardIds].filter((id) => !reviewIds.has(id));
  if (reviewOnly.length || cardsOnly.length) {
    throw syncError("knowledge_review_id_mismatch", { reviewOnlyCount: reviewOnly.length, cardsOnlyCount: cardsOnly.length, reviewOnly, cardsOnly });
  }
  const byId = new Map(reviewRows.map((row) => [idOf(row), row]));
  const synced = cards.map((card) => {
    const review = byId.get(idOf(card));
    const next = { ...card };
    for (const field of REVIEW_FIELDS) {
      if (Object.hasOwn(review, field) && review[field] !== undefined && review[field] !== null) next[field] = review[field];
    }
    if (JSON.stringify(withoutReviewFields(next)) !== JSON.stringify(withoutReviewFields(card))) throw syncError("knowledge_professional_content_changed");
    return next;
  });
  if (synced.length !== cards.length) throw syncError("knowledge_card_count_changed");
  return synced;
}

function readJsonl(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim()).map(JSON.parse);
}

function writeRuntimeKnowledgeBase({ reviewRows, cardsPath, sourcesPath, outputDirectory, knowledgeBaseVersion = "0.2", schemaVersion = "v0.2" }) {
  const cards = readJsonl(cardsPath);
  const professionalContentHashBefore = professionalContentHash(cards);
  const synced = synchronizeKnowledgeReview({ reviewRows, cards });
  const professionalContentHashAfter = professionalContentHash(synced);
  if (professionalContentHashBefore !== professionalContentHashAfter) throw syncError("knowledge_professional_content_hash_changed");
  const approvedCardCount = synced.filter((card) => card.review_status === "approved").length;
  const uniqueCardCount = new Set(synced.map(idOf)).size;
  if (uniqueCardCount !== synced.length) throw syncError("knowledge_runtime_duplicate_id");
  const sources = JSON.parse(fs.readFileSync(sourcesPath, "utf8").replace(/^\uFEFF/, ""));
  const sourcesVersion = String(sources.version || knowledgeBaseVersion);
  const backupPath = `${cardsPath}.backup-${Date.now()}`;
  fs.copyFileSync(cardsPath, backupPath, fs.constants.COPYFILE_EXCL);
  const syncedText = `${synced.map((card) => JSON.stringify(card)).join("\n")}\n`;
  const sourceTempPath = `${cardsPath}.tmp-${process.pid}`;
  fs.writeFileSync(sourceTempPath, syncedText, "utf8");
  fs.renameSync(sourceTempPath, cardsPath);
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, "knowledge_cards.jsonl"), syncedText, "utf8");
  fs.copyFileSync(sourcesPath, path.join(outputDirectory, "sources.json"));
  const manifest = { knowledgeBaseVersion, schemaVersion, sourcesVersion, cardCount: synced.length, approvedCardCount };
  fs.writeFileSync(path.join(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return {
    backupPath,
    outputDirectory,
    cardCount: synced.length,
    uniqueCardCount,
    approvedCardCount,
    professionalContentHashBefore,
    professionalContentHashAfter,
    professionalContentUnchanged: professionalContentHashBefore === professionalContentHashAfter,
  };
}

module.exports = { REVIEW_FIELDS, professionalContentHash, synchronizeKnowledgeReview, writeRuntimeKnowledgeBase };
