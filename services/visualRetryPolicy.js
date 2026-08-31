const MAX_VISUAL_ATTEMPTS = 2;
const DEFAULT_TOTAL_BUDGET_MS = 480000;
const MIN_RETRY_REMAINING_MS = 120000;
const DEFAULT_BACKOFF_MS = 1500;

function boundedNumber(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function visualRetryBudgetMs() {
  return boundedNumber(process.env.VISUAL_RETRY_TOTAL_BUDGET_MS, DEFAULT_TOTAL_BUDGET_MS, 120000, 600000);
}

function safeRetryReason(error) {
  const status = Number(error?.httpStatus || error?.status || 0);
  if (status) return `http_${status}`;
  const source = `${error?.errorCode || ""} ${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  if (/timeout|timed_out|aborterror/.test(source)) return "timeout";
  if (/econnreset|socket hang up|network|fetch failed|eai_again|enotfound/.test(source)) return "temporary_network_error";
  if (/incomplete|stream.*(closed|ended)|unexpected end/.test(source)) return "incomplete_response";
  if (/json.*(parse|trunc)|parse.*json/.test(source) || error?.performanceDiagnostics?.jsonTruncation) return "json_truncation";
  if (/overload|unavailable|rate.?limit/.test(source)) return "provider_temporarily_unavailable";
  return "non_retryable_error";
}

function classifyVisualRetry(error) {
  const status = Number(error?.httpStatus || error?.status || 0);
  if ([400, 401, 403, 404].includes(status)) return { retryable: false, reason: `http_${status}` };
  if ([429, 502, 503, 504].includes(status)) return { retryable: true, reason: `http_${status}` };

  const source = `${error?.errorCode || ""} ${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  if (/api[_-]?key[_-]?missing|model[_-]?not[_-]?found|invalid[_-]?(?:model|image)|schema[_-]?invalid|bad[_-]?request|unauthor|forbidden|permission|cancel/.test(source)) {
    return { retryable: false, reason: safeRetryReason(error) };
  }
  if (error?.performanceDiagnostics?.responseBodyComplete === false
    || error?.performanceDiagnostics?.jsonTruncation
    || /timeout|timed_out|aborterror|econnreset|socket hang up|network|fetch failed|eai_again|enotfound|incomplete|unexpected end|overload|unavailable|rate.?limit|json.*(parse|trunc)|parse.*json/.test(source)) {
    return { retryable: true, reason: safeRetryReason(error) };
  }
  return { retryable: false, reason: safeRetryReason(error) };
}

function normalizedVisualErrorCode(error, classification = classifyVisualRetry(error)) {
  const status = Number(error?.httpStatus || error?.status || 0);
  if (status === 400) return "invalid_request";
  if (status === 401) return "authentication_failed";
  if (status === 403) return "permission_denied";
  if (status === 404) return /model[_-]?not[_-]?found/i.test(String(error?.errorCode || error?.code || error?.message || ""))
    ? "model_not_found"
    : "not_found";
  if (status === 429) return "rate_limited";
  if ([502, 503, 504].includes(status)) return "provider_unavailable";
  const known = {
    timeout: "timeout",
    temporary_network_error: "network_error",
    incomplete_response: "incomplete_response",
    json_truncation: "json_truncation",
    provider_temporarily_unavailable: "provider_unavailable",
    non_retryable_error: "provider_error",
  };
  return known[classification.reason] || "provider_error";
}

function notifyAttempt(onAttempt, event) {
  try {
    onAttempt(event);
  } catch {
    try { console.warn("[visual-attempt-log] status=callback_failed code=callback_failed"); } catch {}
  }
}

async function executeVisualWithRetry({
  attempt,
  providerTimeoutMs,
  totalBudgetMs = visualRetryBudgetMs(),
  minRetryRemainingMs = MIN_RETRY_REMAINING_MS,
  backoffMs = DEFAULT_BACKOFF_MS,
  now = Date.now,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  onRetry = () => {},
  onAttempt = () => {},
}) {
  const startedAt = now();
  const attempts = [];
  let lastError;

  for (let attemptNumber = 1; attemptNumber <= MAX_VISUAL_ATTEMPTS; attemptNumber += 1) {
    const remainingBeforeAttemptMs = Math.max(0, totalBudgetMs - (now() - startedAt));
    const timeoutMs = Math.max(1, Math.min(providerTimeoutMs, remainingBeforeAttemptMs));
    const attemptStartedAt = now();
    try {
      const result = await attempt({ attemptNumber, timeoutMs });
      const successAttempt = {
        attemptNumber,
        status: "success",
        latencyMs: Math.max(0, now() - attemptStartedAt),
        timeoutMs,
        normalizedErrorCode: null,
        httpStatus: null,
        retryable: false,
        reason: null,
        budgetRemainingMs: Math.max(0, totalBudgetMs - (now() - startedAt)),
      };
      attempts.push(successAttempt);
      notifyAttempt(onAttempt, successAttempt);
      return {
        result,
        diagnostics: {
          attempts,
          attemptCount: attempts.length,
          retryCount: attempts.length - 1,
          totalBudgetMs,
          totalLatencyMs: Math.max(0, now() - startedAt),
          finalStatus: "success",
        },
      };
    } catch (error) {
      lastError = error;
      const classification = classifyVisualRetry(error);
      const remainingAfterAttemptMs = Math.max(0, totalBudgetMs - (now() - startedAt));
      const failedAttempt = {
        attemptNumber,
        status: "failed",
        latencyMs: Math.max(0, now() - attemptStartedAt),
        timeoutMs,
        normalizedErrorCode: normalizedVisualErrorCode(error, classification),
        retryable: classification.retryable,
        reason: classification.reason,
        httpStatus: Number(error?.httpStatus || 0) || undefined,
        budgetRemainingMs: remainingAfterAttemptMs,
      };
      attempts.push(failedAttempt);
      notifyAttempt(onAttempt, failedAttempt);
      const canRetry = attemptNumber < MAX_VISUAL_ATTEMPTS
        && classification.retryable
        && remainingAfterAttemptMs - backoffMs >= minRetryRemainingMs;
      if (!canRetry) break;
      onRetry({ attemptNumber: attemptNumber + 1, reason: classification.reason, remainingBudgetMs: remainingAfterAttemptMs });
      await sleep(backoffMs);
    }
  }

  lastError.visualRetryDiagnostics = {
    attempts,
    attemptCount: attempts.length,
    retryCount: Math.max(0, attempts.length - 1),
    totalBudgetMs,
    totalLatencyMs: Math.max(0, now() - startedAt),
    finalStatus: "failed",
  };
  throw lastError;
}

module.exports = {
  DEFAULT_TOTAL_BUDGET_MS,
  MAX_VISUAL_ATTEMPTS,
  MIN_RETRY_REMAINING_MS,
  classifyVisualRetry,
  executeVisualWithRetry,
  normalizedVisualErrorCode,
  visualRetryBudgetMs,
};
