const { generateAnalysisWithModelRouter } = require("../services/modelRouter");
const {
  resolveModelRuntimeConfig,
  resolveOrganizationModelRuntimeConfig,
} = require("../services/modelRuntimeConfigService");
const { readJsonBody, requireActiveProfileIfConfigured } = require("./_supabase");
const { getBearerToken } = require("./_http");
const { getRuntimeMode } = require("../config/runtimeMode");
const { requireCurrentUser } = require("../services/authService");
const { recordUsage } = require("../services/usageService");
const { buildSafeAnalysisDiagnostics } = require("../services/imageInputMetadata");
const { analysisCoreStore } = require("../services/ephemeralAnalysisCoreStore");

function accessCodeFrom(req, body) {
  return req.headers["x-access-code"] || body.accessCode || "";
}

function verifyAccessCode(code) {
  if (!process.env.ACCESS_CODE) throw new Error("missing_access_code_config");
  return String(code) === String(process.env.ACCESS_CODE);
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function safeErrorMessage(error) {
  if (!error) return "unknown_error";
  if (typeof error === "string") return error;
  return error.message || error.name || "unknown_error";
}

function shapeCnAnalysisResponse(result, user, image, analysisSessionId = "") {
  const { observationRecord, caseAnalysisCore, ...withoutLegacyPacket } = result;
  const session = analysisSessionId ? { analysisSessionId } : {};
  if (user.role === "admin") {
    return {
      ...withoutLegacyPacket,
      ...session,
      adminDiagnostics: buildSafeAnalysisDiagnostics({ analysisResult: result, imageDataUrl: image }),
    };
  }
  const {
    analysisPacket,
    factSnapshot,
    mode,
    provider,
    model,
    promptVersion,
    providers,
    usage,
    ...teacherResult
  } = withoutLegacyPacket;
  if (teacherResult.diagnostics) {
    const { factConsistency, performance, pipeline, runtime, ...teacherDiagnostics } = teacherResult.diagnostics;
    teacherResult.diagnostics = teacherDiagnostics;
  }
  return { ...teacherResult, ...session };
}

function analysisOwnerKey(user) {
  return user ? `cn:${user.organizationId}:${user.id}` : "legacy";
}

function applyCumulativePipelineDiagnostics(target, sessionState) {
  if (!target?.diagnostics?.pipeline || !sessionState) return target;
  target.diagnostics.pipeline = {
    ...target.diagnostics.pipeline,
    visualCalls: sessionState.visualCalls,
    reportCalls: sessionState.reportCalls,
    visualReused: target.diagnostics.pipeline.visualReused === true,
    caseCoreAvailable: true,
  };
  return target;
}

function createAnalyzeHandler(dependencies = {}) {
  const generateAnalysis = dependencies.generateAnalysis || generateAnalysisWithModelRouter;
  const runtimeMode = dependencies.getRuntimeMode || getRuntimeMode;
  const currentUser = dependencies.requireCurrentUser || requireCurrentUser;
  const resolveOrganizationRuntime = dependencies.resolveOrganizationModelRuntimeConfig || resolveOrganizationModelRuntimeConfig;
  const resolveRequestRuntime = dependencies.resolveModelRuntimeConfig || resolveModelRuntimeConfig;
  const usageRecorder = dependencies.recordUsage || recordUsage;
  const coreStore = dependencies.analysisCoreStore || analysisCoreStore;

  return async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" });

  let body = {};
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: "bad_json" });
  }

  const { image, profile = {}, analysisSessionId = "", analysisRequestId = "" } = body;
  const runtime = runtimeMode();
  let authenticatedCnUser = null;
  try {
    if (runtime.usesCnAuth) {
      authenticatedCnUser = currentUser(getBearerToken(req));
    } else {
      if (!verifyAccessCode(accessCodeFrom(req, body))) {
        return sendJson(res, 401, { error: "invalid_access_code" });
      }
      await requireActiveProfileIfConfigured(req);
    }
  } catch (error) {
    const message = safeErrorMessage(error);
    const status = ["missing_login_token", "invalid_login_state", "profile_not_found", "account_disabled", "authentication_required", "session_invalid", "user_inactive"].includes(message)
      ? error.statusCode || 401
      : error.statusCode || 500;
    return sendJson(res, status, { error: message });
  }

  const ownerKey = analysisOwnerKey(authenticatedCnUser);
  const existingSession = analysisSessionId ? coreStore.get(analysisSessionId, ownerKey) : null;
  if (analysisSessionId && !existingSession) {
    return sendJson(res, 410, { error: "analysis_session_invalid" });
  }
  const caseAnalysisCore = existingSession?.caseAnalysisCore || null;

  if (!caseAnalysisCore && (!image || typeof image !== "string" || !image.startsWith("data:image/"))) {
    return sendJson(res, 400, { error: "invalid_image" });
  }
  if (typeof image === "string" && image.length > 7_200_000) {
    return sendJson(res, 413, { error: "image_too_large" });
  }

  try {
    const modelRuntimeConfig = runtime.usesCnAuth && authenticatedCnUser
      ? resolveOrganizationRuntime(authenticatedCnUser.organizationId)
      : resolveRequestRuntime(body.modelConfig || {}, { source: "request" });
    const modelConfig = modelRuntimeConfig.modelConfig;
    if (modelRuntimeConfig.analysisMode === "legacy_dual_model" && !image) {
      return sendJson(res, 400, { error: "invalid_image" });
    }
    const result = await generateAnalysis({
      images: image ? [image] : [],
      userInputs: profile,
      contentType: profile.contentType || profile.desiredHelp || profile.reportMode,
      modelConfig,
      modelRuntimeConfig,
      caseAnalysisCore,
      onStage: (stage) => coreStore.setProgress(analysisRequestId, ownerKey, stage),
    });
    let sessionState = existingSession;
    if (result.caseAnalysisCore) {
      const pipeline = result.diagnostics?.pipeline || {};
      if (existingSession) {
        sessionState = coreStore.update(existingSession.analysisSessionId, ownerKey, {
          caseAnalysisCore: result.caseAnalysisCore,
          visualCallsDelta: pipeline.visualCalls,
          reportCallsDelta: pipeline.reportCalls,
        });
      } else {
        const newSessionId = coreStore.create({
          ownerKey,
          caseAnalysisCore: result.caseAnalysisCore,
          visualCalls: pipeline.visualCalls,
          reportCalls: pipeline.reportCalls,
        });
        sessionState = coreStore.get(newSessionId, ownerKey);
      }
      applyCumulativePipelineDiagnostics(result, sessionState);
    }
    coreStore.deleteProgress(analysisRequestId, ownerKey);
    if (runtime.usesCnAuth && authenticatedCnUser) {
      try {
        usageRecorder({
          user: authenticatedCnUser,
          contentType: profile.contentType || profile.desiredHelp || profile.reportMode,
          modelConfig,
          analysisResult: result,
        });
      } catch {
        console.warn("usage_record_write_failed");
      }
    }
    if (runtime.usesCnAuth && authenticatedCnUser) {
      return sendJson(res, 200, shapeCnAnalysisResponse(result, authenticatedCnUser, image, sessionState?.analysisSessionId));
    }
    const { caseAnalysisCore: omittedCore, ...safeResult } = result;
    return sendJson(res, 200, { ...safeResult, ...(sessionState?.analysisSessionId ? { analysisSessionId: sessionState.analysisSessionId } : {}) });
  } catch (error) {
    coreStore.deleteProgress(analysisRequestId, ownerKey);
    const message = safeErrorMessage(error);
    let errorSession = existingSession;
    if (error.caseAnalysisCore) {
      const pipeline = error.pipelineDiagnostics || {};
      if (existingSession) {
        errorSession = coreStore.update(existingSession.analysisSessionId, ownerKey, {
          caseAnalysisCore: error.caseAnalysisCore,
          visualCallsDelta: pipeline.visualCalls,
          reportCallsDelta: pipeline.reportCalls,
        });
      } else {
        const newSessionId = coreStore.create({
          ownerKey,
          caseAnalysisCore: error.caseAnalysisCore,
          visualCalls: pipeline.visualCalls,
          reportCalls: pipeline.reportCalls,
        });
        errorSession = coreStore.get(newSessionId, ownerKey);
      }
      error.pipelineDiagnostics = {
        ...pipeline,
        visualCalls: errorSession.visualCalls,
        reportCalls: errorSession.reportCalls,
        caseCoreAvailable: true,
      };
    }
    const sessionPayload = errorSession?.analysisSessionId ? { analysisSessionId: errorSession.analysisSessionId } : {};
    console.error("model_call_failed", {
      name: error?.name || "Error",
      provider: error?.provider || "",
      model: error?.model || "",
      baseUrlHost: error?.baseUrlHost || "",
      httpStatus: error?.httpStatus || undefined,
      errorCode: error?.errorCode || String(message).split(":")[0],
      configSource: error?.configSource || "",
    });
    const failurePacket = error.analysisPacket || error.caseAnalysisCore?.visualAnalysis?.analysisPacket || null;
    const failurePipeline = error.pipelineDiagnostics || {};
    const adminFailurePayload = runtime.usesCnAuth && authenticatedCnUser?.role === "admin"
      ? {
        ...(failurePacket ? { analysisPacket: failurePacket } : {}),
        adminDiagnostics: buildSafeAnalysisDiagnostics({
          analysisResult: {
            mode: failurePipeline.pipelineMode || error.mode || "",
            provider: [failurePipeline.visualProvider, failurePipeline.reportProvider].filter(Boolean).join("->"),
            model: [failurePipeline.visualModel, failurePipeline.reportModel].filter(Boolean).join("->"),
            promptVersion: failurePipeline.visualPromptVersion || error.promptVersion || "",
            analysisPacket: failurePacket || {},
            factSnapshot: error.factSnapshot || error.caseAnalysisCore?.visualAnalysis?.criticalVisualFacts,
            diagnostics: {
              factConsistency: error.factConsistency || { status: "not_checked", conflicts: [] },
              pipeline: failurePipeline,
              performance: error.performanceDiagnostics || {},
              knowledge: error.caseAnalysisCore ? {
                knowledgeStatus: error.caseAnalysisCore.knowledge?.status || "",
                knowledgeBaseVersion: error.caseAnalysisCore.knowledge?.knowledgeBaseVersion || "",
                matchedFeatureCodes: error.caseAnalysisCore.knowledge?.matchedFeatureCodes || [],
                matchedCardIds: error.caseAnalysisCore.knowledge?.matchedCardIds || [],
              } : {},
            },
            caseAnalysisCore: error.caseAnalysisCore,
          },
          imageDataUrl: image,
        }),
      }
      : {};
    if (message === "provider_not_implemented") {
      return sendJson(res, 400, {
        error: "provider_not_implemented",
        message: "当前模型供应商已保存，但该供应商的真实调用适配尚未完成。请暂时切回 OpenAI，或继续接入国内模型。",
      });
    }
    if (message === "report_fact_conflict") {
      if (runtime.usesCnAuth && authenticatedCnUser?.role === "admin" && error.analysisPacket) {
        return sendJson(res, 409, {
          error: "model_call_failed:report_fact_conflict",
          ...sessionPayload,
          ...adminFailurePayload,
        });
      }
      return sendJson(res, 409, { error: "model_call_failed:report_fact_conflict", ...sessionPayload });
    }
    if (message === "report_knowledge_policy_conflict") {
      return sendJson(res, 409, { error: "model_call_failed:report_knowledge_policy_conflict", ...sessionPayload, ...adminFailurePayload });
    }
    if (message.startsWith("visual_analysis_failed:")) {
      return sendJson(res, 502, { error: "visual_analysis_failed", ...adminFailurePayload });
    }
    if (message.startsWith("report_generation_failed:")) {
      return sendJson(res, 502, { error: "report_generation_failed", ...sessionPayload, ...adminFailurePayload });
    }
    if (message === "report_generation_truncated") {
      return sendJson(res, 502, { error: "report_generation_truncated", ...sessionPayload, ...adminFailurePayload });
    }
    return sendJson(res, 500, { error: `model_call_failed:${message}` });
  }
  };
}

const handler = createAnalyzeHandler();
module.exports = handler;
module.exports.createAnalyzeHandler = createAnalyzeHandler;
module.exports.shapeCnAnalysisResponse = shapeCnAnalysisResponse;
