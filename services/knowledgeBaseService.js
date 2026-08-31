const fs = require("node:fs");
const path = require("node:path");
const {
  auditNormalizedCard,
  compactKnowledgeCard,
  normalizeKnowledgeCard,
} = require("./knowledgeCardNormalizer");
const { extractKnowledgeFeatures } = require("./knowledgeFeatureExtractor");
const { cardMatchesFeature, cardRequirementsSatisfied } = require("./knowledgeFeatureMapping");
const { classifyKnowledgeUse, normalizeOutputType } = require("./knowledgeUsePolicy");

const RETRIEVAL_VERSION = "deterministic-v0.2-explicit";
const DEFAULT_LIMITS = { guardrail: 8, evidence: 12, hypothesis: 12, interview: 8, restricted: 12 };

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function readJsonl(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim()).map((line, index) => {
    try { return JSON.parse(line); } catch { throw new Error(`knowledge_jsonl_invalid_line_${index + 1}`); }
  });
}

function sourceIds(sources) {
  const rows = Array.isArray(sources) ? sources : Array.isArray(sources?.sources) ? sources.sources : [];
  return new Set(rows.map((item) => String(item.source_id || item.sourceId || item.id || "")).filter(Boolean));
}

function increment(target, key) {
  const safeKey = key || "unknown";
  target[safeKey] = (target[safeKey] || 0) + 1;
}

function safeStatusError(error) {
  return String(error?.message || "knowledge_base_load_failed").replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 160);
}

function matchScore(card, feature, activeFeatures) {
  return cardMatchesFeature(card, feature, activeFeatures) ? 100 : 0;
}

function uniqueQuestions(items, max = 8) {
  const output = [];
  const seen = new Set();
  for (const item of items) {
    const question = typeof item === "string" ? item.trim() : String(item?.question || "").trim();
    if (!question || /是不是.*(?:创伤|受过伤|虐待)|(?:代表|证明|说明你一定)/.test(question)) continue;
    const key = question.replace(/[\s，。？！,.?!]/g, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(typeof item === "string" ? { question } : { ...item, question });
    if (output.length >= max) break;
  }
  return output;
}

class KnowledgeBaseService {
  constructor({ directory, logger = console } = {}) {
    this.directory = path.resolve(directory || process.env.KNOWLEDGE_BASE_DIR || path.join(__dirname, "..", "knowledge-base"));
    this.logger = logger;
    this.state = this.emptyState("disabled");
  }

  emptyState(status) {
    return {
      status,
      knowledgeBaseVersion: "",
      schemaVersion: "",
      totalCardCount: 0,
      approvedCardCount: 0,
      usableCardCount: 0,
      byRole: {},
      byEvidenceLevel: {},
      loadedAt: "",
      warnings: [],
      error: "",
      cards: [],
    };
  }

  load({ enabled = true } = {}) {
    if (!enabled) {
      this.state = this.emptyState("disabled");
      return this.getStatus();
    }
    try {
      const manifest = readJson(path.join(this.directory, "manifest.json"));
      const rawCards = readJsonl(path.join(this.directory, "knowledge_cards.jsonl"));
      const sources = readJson(path.join(this.directory, "sources.json"));
      const knownSources = sourceIds(sources);
      const cards = rawCards.map(normalizeKnowledgeCard);
      const ids = cards.map((card) => card.cardId);
      if (ids.some((id) => !id)) throw new Error("knowledge_card_id_missing");
      if (new Set(ids).size !== ids.length) throw new Error("knowledge_card_id_duplicate");
      const warnings = [];
      for (const card of cards) {
        const audit = auditNormalizedCard(card, knownSources);
        if (audit.errors.length) throw new Error(`knowledge_card_schema_invalid_${card.cardId}_${audit.errors[0]}`);
        warnings.push(...audit.warnings.map((warning) => `${card.cardId}:${warning}`));
      }
      const approved = cards.filter((card) => card.reviewStatus === "approved");
      const usable = approved.filter((card) => card.automationPolicy !== "do_not_surface_without_human_review");
      if (Number(manifest.cardCount) !== cards.length) throw new Error("knowledge_manifest_card_count_mismatch");
      if (Number(manifest.approvedCardCount) !== approved.length) throw new Error("knowledge_manifest_approved_count_mismatch");
      const byRole = {};
      const byEvidenceLevel = {};
      for (const card of approved) {
        increment(byRole, card.cardRole);
        increment(byEvidenceLevel, card.evidenceLevel);
      }
      this.state = {
        status: "loaded",
        knowledgeBaseVersion: String(manifest.knowledgeBaseVersion || ""),
        schemaVersion: String(manifest.schemaVersion || ""),
        totalCardCount: cards.length,
        approvedCardCount: approved.length,
        usableCardCount: usable.length,
        byRole,
        byEvidenceLevel,
        loadedAt: new Date().toISOString(),
        warnings,
        error: "",
        cards: approved,
      };
      this.logger.info?.(`[knowledge-base] version=${this.state.knowledgeBaseVersion} enabled=true approvedCardCount=${approved.length}`);
    } catch (error) {
      this.state = { ...this.emptyState("load_failed"), error: safeStatusError(error) };
      this.logger.warn?.(`knowledge_base_load_failed error=${this.state.error}`);
    }
    return this.getStatus();
  }

  ensureLoaded({ enabled = true } = {}) {
    if (!enabled) return this.load({ enabled: false });
    if (this.state.status === "disabled") this.load({ enabled: true });
    return this.getStatus();
  }

  getStatus() {
    const { cards, warnings, ...safe } = this.state;
    return { ...safe, warningCount: warnings.length };
  }

  getPreAnalysisGuardrails({ enabled = true, limit = DEFAULT_LIMITS.guardrail } = {}) {
    this.ensureLoaded({ enabled });
    if (this.state.status !== "loaded") return [];
    return this.state.cards.filter((card) => ["system_guardrail", "context_guardrail"].includes(card.cardRole))
      .filter((card) => ["system_rule_only", "reduce_pathology_weight", "must_trigger_before_final_interpretation", "must_check_before_hypothesis"].includes(card.automationPolicy))
      .slice(0, limit).map(compactKnowledgeCard);
  }

  retrieve({ analysisPacket = {}, factSnapshot, outputType, enabled = true, limits = {} } = {}) {
    const status = this.ensureLoaded({ enabled });
    const features = extractKnowledgeFeatures(analysisPacket, factSnapshot);
    const base = {
      knowledgeBaseVersion: status.knowledgeBaseVersion,
      retrievalVersion: RETRIEVAL_VERSION,
      totalCardCount: status.totalCardCount,
      approvedCardCount: status.approvedCardCount,
      runtimeUsableCardCount: status.usableCardCount,
      matchedCardCount: 0,
      matchedFeatureCodes: features.map((item) => item.code),
      guardrailCards: [], evidenceCards: [], hypothesisCards: [], interviewCards: [], restrictedCards: [], matchedCardIds: [],
      diagnostics: {
        knowledgeEnabled: Boolean(enabled),
        knowledgeStatus: status.status,
        candidateCount: 0,
        selectedCount: 0,
        skippedLowConfidenceFeatures: features.filter((item) => item.confidence === "low").map((item) => item.code),
      },
    };
    if (!enabled || status.status !== "loaded") return base;
    const candidates = [];
    for (const card of this.state.cards) {
      if (["system_guardrail", "context_guardrail"].includes(card.cardRole)) {
        candidates.push({ card, feature: { code: "global", confidence: "high" }, score: 10 });
        continue;
      }
      for (const feature of features) {
        const score = matchScore(card, feature, features);
        if (score) candidates.push({ card, feature, score });
      }
    }
    candidates.sort((a, b) => b.score - a.score || a.card.cardId.localeCompare(b.card.cardId));
    base.diagnostics.candidateCount = candidates.length;
    const selectedIds = new Set();
    const buckets = { guardrail: [], evidence: [], hypothesis: [], interview: [], restricted: [] };
    for (const candidate of candidates) {
      if (selectedIds.has(candidate.card.cardId)) continue;
      const use = classifyKnowledgeUse(candidate.card, normalizeOutputType(outputType), candidate.feature);
      const internallyRestricted = !use.allowed && use.use === "restricted" && use.reason === "human_review_required";
      if ((!use.allowed && !internallyRestricted) || !buckets[use.use]) continue;
      const limit = Number(limits[use.use] || DEFAULT_LIMITS[use.use]);
      if (buckets[use.use].length >= limit) continue;
      selectedIds.add(candidate.card.cardId);
      buckets[use.use].push({
        ...compactKnowledgeCard(candidate.card),
        matched_feature_code: candidate.feature.code,
        matched_observation_ids: candidate.feature.observationIds || [],
        tentative: Boolean(use.tentative),
        restricted_to_internal_grounding: internallyRestricted,
      });
    }
    base.guardrailCards = buckets.guardrail;
    base.evidenceCards = buckets.evidence;
    base.hypothesisCards = buckets.hypothesis;
    base.interviewCards = buckets.interview;
    base.restrictedCards = buckets.restricted;
    base.matchedCardIds = [...selectedIds];
    base.matchedCardCount = selectedIds.size;
    base.diagnostics.selectedCount = selectedIds.size;
    if (status.status === "loaded" && selectedIds.size > 0 && Number(base.approvedCardCount) === 0) {
      this.logger.warn?.("[knowledge-retrieval] status=count_mismatch approvedCardCount=0 matchedCardCount_nonzero=true");
    }
    this.logger.info?.(`[knowledge-retrieval] version=${RETRIEVAL_VERSION} knowledgeEnabled=true matchedCardCount=${selectedIds.size} matchedCardIds=${base.matchedCardIds.join(",")}`);
    return base;
  }

  groundAnalysisPacket({ analysisPacket = {}, factSnapshot, outputType, enabled = true } = {}) {
    const context = this.retrieve({ analysisPacket, factSnapshot, outputType, enabled });
    const packet = structuredClone(analysisPacket);
    const featureCards = [
      ...context.evidenceCards,
      ...context.hypothesisCards,
      ...context.interviewCards,
      ...context.restrictedCards,
    ];
    packet.hypothesis_candidates = (Array.isArray(packet.hypothesis_candidates) ? packet.hypothesis_candidates : []).map((hypothesis) => {
      const basedOn = new Set(Array.isArray(hypothesis.based_on_observation_ids) ? hypothesis.based_on_observation_ids : []);
      const hypothesisCards = featureCards.filter((card) => (card.matched_observation_ids || []).some((id) => basedOn.has(id)));
      const ids = hypothesisCards.map((card) => card.card_id);
      const evidenceLevels = [...new Set(hypothesisCards.map((card) => card.evidence_level).filter(Boolean))];
      const doNotInfer = [...new Set(hypothesisCards.flatMap((card) => card.do_not_infer || []))];
      const restricted = doNotInfer.length > 0
        || hypothesisCards.some((card) => card.user_facing_allowed === false || card.automation_policy === "do_not_surface_without_human_review");
      const groundingStatus = !ids.length ? "no_approved_match" : restricted || doNotInfer.length ? "restricted" : evidenceLevels.some((level) => ["D", "E"].includes(level)) ? "partial_support" : "approved_support";
      return {
        ...hypothesis,
        knowledge_card_ids: ids,
        source_basis: ids.length ? [...new Set([...(hypothesis.source_basis || []), "approved_knowledge_base"])] : [...new Set([...(hypothesis.source_basis || []), "model_general_knowledge"])],
        knowledge_grounding: {
          status: groundingStatus,
          hypothesis_status: "unverified",
          evidence_levels: evidenceLevels,
          requires_inquiry_confirmation: true,
          user_facing_allowed: ids.length > 0 && !restricted && hypothesisCards.every((card) => card.user_facing_allowed !== false),
          matched_card_ids: ids,
          do_not_infer: doNotInfer,
        },
      };
    });
    const existingQuestions = Array.isArray(packet.priority_questions) ? packet.priority_questions : [];
    const activeFeatures = extractKnowledgeFeatures(packet, factSnapshot);
    const knowledgeQuestions = context.interviewCards
      .filter((card) => cardRequirementsSatisfied(card, activeFeatures))
      .flatMap((card) => {
        const matchedIds = new Set(card.matched_observation_ids || []);
        const relatedHypothesisIds = packet.hypothesis_candidates
          .filter((hypothesis) => (hypothesis.based_on_observation_ids || []).some((id) => matchedIds.has(id)))
          .map((hypothesis) => hypothesis.hypothesis_id).filter(Boolean);
        return (card.recommended_questions || []).map((question) => ({
          question,
          purpose: "核对知识库支持的探索方向，并允许推翻初步假设",
          related_hypothesis_ids: relatedHypothesisIds,
          knowledge_card_ids: [card.card_id],
        }));
      });
    packet.priority_questions = uniqueQuestions([...existingQuestions, ...knowledgeQuestions], 8).map((item, index) => ({
      question_id: item.question_id || `KQ${index + 1}`,
      question: item.question,
      purpose: item.purpose || "进一步核对创作者的个人意义",
      related_hypothesis_ids: Array.isArray(item.related_hypothesis_ids) ? item.related_hypothesis_ids : [],
      ...(item.knowledge_card_ids ? { knowledge_card_ids: item.knowledge_card_ids } : {}),
    }));
    return { analysisPacket: packet, knowledgeContext: context };
  }
}

let singleton;
function getKnowledgeBaseService() {
  if (!singleton) singleton = new KnowledgeBaseService();
  return singleton;
}

function resetKnowledgeBaseServiceForTests() {
  singleton = undefined;
}

module.exports = { KnowledgeBaseService, RETRIEVAL_VERSION, getKnowledgeBaseService, resetKnowledgeBaseServiceForTests, uniqueQuestions };
