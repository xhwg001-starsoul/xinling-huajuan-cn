const { generateAnalysisWithModelRouter } = require("../services/modelRouter");
const { getOrganizationModelSettings } = require("../services/systemModelSettingsService");
const { readJsonBody, requireActiveProfileIfConfigured } = require("./_supabase");
const { getBearerToken } = require("./_http");
const { getRuntimeMode } = require("../config/runtimeMode");
const { requireCurrentUser } = require("../services/authService");
const { recordUsage } = require("../services/usageService");

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

async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" });

  let body = {};
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: "bad_json" });
  }

  const { image, profile = {} } = body;
  const runtime = getRuntimeMode();
  let authenticatedCnUser = null;
  try {
    if (runtime.usesCnAuth) {
      authenticatedCnUser = requireCurrentUser(getBearerToken(req));
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

  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    return sendJson(res, 400, { error: "invalid_image" });
  }
  if (image.length > 7_200_000) {
    return sendJson(res, 413, { error: "image_too_large" });
  }

  try {
    const modelConfig = runtime.usesCnAuth && authenticatedCnUser
      ? getOrganizationModelSettings(authenticatedCnUser.organizationId)
      : body.modelConfig || {};
    const result = await generateAnalysisWithModelRouter({
      images: [image],
      userInputs: profile,
      contentType: profile.contentType || profile.desiredHelp || profile.reportMode,
      modelConfig,
    });
    if (runtime.usesCnAuth && authenticatedCnUser) {
      try {
        recordUsage({
          user: authenticatedCnUser,
          contentType: profile.contentType || profile.desiredHelp || profile.reportMode,
          modelConfig,
        });
      } catch {
        console.warn("usage_record_write_failed");
      }
    }
    return sendJson(res, 200, result);
  } catch (error) {
    const message = safeErrorMessage(error);
    console.error("model_call_failed", {
      name: error?.name || "Error",
      message,
      provider: error?.provider || "",
    });
    if (message === "provider_not_implemented") {
      return sendJson(res, 400, {
        error: "provider_not_implemented",
        message: "当前模型供应商已保存，但该供应商的真实调用适配尚未完成。请暂时切回 OpenAI，或继续接入国内模型。",
      });
    }
    return sendJson(res, 500, { error: `model_call_failed:${message}` });
  }
}

module.exports = handler;
