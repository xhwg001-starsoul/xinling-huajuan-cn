const crypto = require("node:crypto");
const { assertCaseAnalysisCore } = require("./caseAnalysisCore");

const DEFAULT_TTL_MS = 30 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 200;

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

class EphemeralAnalysisCoreStore {
  constructor({ ttlMs, maxEntries, now = () => Date.now() } = {}) {
    this.ttlMs = boundedInteger(ttlMs, DEFAULT_TTL_MS, 60_000, 24 * 60 * 60 * 1000);
    this.maxEntries = boundedInteger(maxEntries, DEFAULT_MAX_ENTRIES, 10, 2000);
    this.now = now;
    this.entries = new Map();
    this.progressEntries = new Map();
  }

  prune({ reserveCoreSlot = false } = {}) {
    const now = this.now();
    for (const [id, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(id);
    }
    for (const [id, entry] of this.progressEntries) {
      if (entry.expiresAt <= now) this.progressEntries.delete(id);
    }
    const coreLimit = reserveCoreSlot ? this.maxEntries - 1 : this.maxEntries;
    while (this.entries.size > coreLimit) {
      const oldest = this.entries.keys().next().value;
      if (!oldest) break;
      this.entries.delete(oldest);
    }
    while (this.progressEntries.size > this.maxEntries * 2) {
      const oldest = this.progressEntries.keys().next().value;
      if (!oldest) break;
      this.progressEntries.delete(oldest);
    }
  }

  create({ ownerKey, caseAnalysisCore, visualCalls = 1, reportCalls = 1 }) {
    this.prune({ reserveCoreSlot: true });
    const now = this.now();
    const analysisSessionId = crypto.randomBytes(24).toString("base64url");
    this.entries.set(analysisSessionId, {
      ownerKey: String(ownerKey || ""),
      caseAnalysisCore: assertCaseAnalysisCore(structuredClone(caseAnalysisCore)),
      visualCalls: Number(visualCalls || 0),
      reportCalls: Number(reportCalls || 0),
      createdAt: now,
      expiresAt: now + this.ttlMs,
    });
    return analysisSessionId;
  }

  get(analysisSessionId, ownerKey) {
    this.prune();
    const id = String(analysisSessionId || "");
    const entry = this.entries.get(id);
    if (!entry || entry.ownerKey !== String(ownerKey || "")) return null;
    entry.expiresAt = this.now() + this.ttlMs;
    return {
      analysisSessionId: id,
      caseAnalysisCore: structuredClone(entry.caseAnalysisCore),
      visualCalls: entry.visualCalls,
      reportCalls: entry.reportCalls,
    };
  }

  update(analysisSessionId, ownerKey, { caseAnalysisCore, visualCallsDelta = 0, reportCallsDelta = 0 } = {}) {
    const existing = this.get(analysisSessionId, ownerKey);
    if (!existing) return null;
    const entry = this.entries.get(existing.analysisSessionId);
    if (caseAnalysisCore) entry.caseAnalysisCore = assertCaseAnalysisCore(structuredClone(caseAnalysisCore));
    entry.visualCalls += Number(visualCallsDelta || 0);
    entry.reportCalls += Number(reportCallsDelta || 0);
    entry.expiresAt = this.now() + this.ttlMs;
    return this.get(existing.analysisSessionId, ownerKey);
  }

  clear() {
    this.entries.clear();
    this.progressEntries.clear();
  }

  setProgress(requestId, ownerKey, stage) {
    const id = String(requestId || "");
    if (!/^[a-f0-9-]{20,64}$/i.test(id)) return;
    this.prune();
    this.progressEntries.set(id, {
      ownerKey: String(ownerKey || ""),
      stage: ["visual", "knowledge", "report"].includes(stage) ? stage : "visual",
      expiresAt: this.now() + Math.min(this.ttlMs, 10 * 60 * 1000),
    });
  }

  getProgress(requestId, ownerKey) {
    this.prune();
    const entry = this.progressEntries.get(String(requestId || ""));
    return entry && entry.ownerKey === String(ownerKey || "") ? entry.stage : "";
  }

  deleteProgress(requestId, ownerKey) {
    const id = String(requestId || "");
    const entry = this.progressEntries.get(id);
    if (entry?.ownerKey === String(ownerKey || "")) this.progressEntries.delete(id);
  }
}

const analysisCoreStore = new EphemeralAnalysisCoreStore({
  ttlMs: process.env.ANALYSIS_CORE_TTL_MS,
  maxEntries: process.env.ANALYSIS_CORE_MAX_ENTRIES,
});

module.exports = {
  DEFAULT_MAX_ENTRIES,
  DEFAULT_TTL_MS,
  EphemeralAnalysisCoreStore,
  analysisCoreStore,
};
