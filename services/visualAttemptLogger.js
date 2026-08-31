const fs = require("node:fs");
const path = require("node:path");
const { logsDir: defaultLogsDir } = require("./dataPaths");
const { runtimeVersion } = require("./runtimeIdentity");

const LOG_FILE_NAME = "visual-attempts.log";
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

function safeText(value, maximum = 160) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9._:>/+-]/g, "_")
    .slice(0, maximum);
}

function safeInteger(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null;
}

function safeHttpStatus(value) {
  const parsed = safeInteger(value);
  return parsed && parsed >= 100 && parsed <= 599 ? parsed : null;
}

function safeWriteErrorCode(error) {
  const code = safeText(error?.code || "write_failed", 60).toLowerCase();
  return code || "write_failed";
}

class VisualAttemptLogger {
  constructor({
    logsDir = defaultLogsDir,
    maxBytes = DEFAULT_MAX_BYTES,
    fsImpl = fs,
    now = () => new Date(),
    warningLogger = console,
  } = {}) {
    this.logsDir = path.resolve(logsDir);
    this.filePath = path.join(this.logsDir, LOG_FILE_NAME);
    this.rotatedFilePath = `${this.filePath}.1`;
    this.maxBytes = Math.max(1024, Number(maxBytes) || DEFAULT_MAX_BYTES);
    this.fs = fsImpl;
    this.now = now;
    this.warningLogger = warningLogger;
  }

  attempt(event = {}) {
    return this.append({
      timestamp: this.now().toISOString(),
      requestId: safeText(event.requestId),
      event: "visual_attempt",
      attemptNumber: safeInteger(event.attemptNumber),
      provider: safeText(event.provider, 80),
      model: safeText(event.model, 120),
      status: event.status === "success" ? "success" : "failed",
      latencyMs: safeInteger(event.latencyMs),
      timeoutMs: safeInteger(event.timeoutMs),
      normalizedErrorCode: event.normalizedErrorCode ? safeText(event.normalizedErrorCode, 100) : null,
      httpStatus: safeHttpStatus(event.httpStatus),
      retryable: event.status === "failed" && event.retryable === true,
      retryReason: event.retryReason ? safeText(event.retryReason, 100) : null,
      budgetRemainingMs: safeInteger(event.budgetRemainingMs),
      runtimeVersion: safeText(event.runtimeVersion || runtimeVersion, 100),
      pipelineVersion: safeText(event.pipelineVersion, 80),
    });
  }

  stageResult(event = {}) {
    return this.append({
      timestamp: this.now().toISOString(),
      requestId: safeText(event.requestId),
      event: "visual_stage_result",
      provider: safeText(event.provider, 80),
      model: safeText(event.model, 120),
      status: event.status === "success" ? "success" : "failed",
      visualAttemptCount: safeInteger(event.visualAttemptCount),
      visualRetryCount: safeInteger(event.visualRetryCount),
      totalVisualLatencyMs: safeInteger(event.totalVisualLatencyMs),
      finalErrorCode: event.finalErrorCode ? safeText(event.finalErrorCode, 100) : null,
      runtimeVersion: safeText(event.runtimeVersion || runtimeVersion, 100),
      pipelineVersion: safeText(event.pipelineVersion, 80),
    });
  }

  append(event) {
    try {
      this.fs.mkdirSync(this.logsDir, { recursive: true });
      const line = `${JSON.stringify(event)}\n`;
      this.rotateIfNeeded(Buffer.byteLength(line, "utf8"));
      this.fs.appendFileSync(this.filePath, line, { encoding: "utf8", flag: "a" });
      return true;
    } catch (error) {
      try {
        this.warningLogger.warn(`[visual-attempt-log] status=write_failed code=${safeWriteErrorCode(error)}`);
      } catch {
        // Logging must never affect analysis, including when the warning sink fails.
      }
      return false;
    }
  }

  rotateIfNeeded(incomingBytes) {
    let currentBytes = 0;
    try {
      currentBytes = this.fs.statSync(this.filePath).size;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    if (currentBytes + incomingBytes <= this.maxBytes) return;
    try {
      this.fs.rmSync(this.rotatedFilePath, { force: true });
      this.fs.renameSync(this.filePath, this.rotatedFilePath);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

const visualAttemptLogger = new VisualAttemptLogger();

module.exports = {
  DEFAULT_MAX_BYTES,
  LOG_FILE_NAME,
  VisualAttemptLogger,
  visualAttemptLogger,
};
