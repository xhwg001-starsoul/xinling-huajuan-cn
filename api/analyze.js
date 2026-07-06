const { generateTeacherReport } = require("../model-adapters");
const { readJsonBody, requireActiveProfile } = require("./_supabase");

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
  try {
    if (!verifyAccessCode(accessCodeFrom(req, body))) {
      return sendJson(res, 401, { error: "invalid_access_code" });
    }
    await requireActiveProfile(req);
  } catch (error) {
    const message = safeErrorMessage(error);
    const status = ["missing_login_token", "invalid_login_state", "profile_not_found", "account_disabled"].includes(message) ? 401 : 500;
    return sendJson(res, status, { error: message });
  }

  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    return sendJson(res, 400, { error: "invalid_image" });
  }
  if (image.length > 7_200_000) {
    return sendJson(res, 413, { error: "image_too_large" });
  }

  try {
    const result = await generateTeacherReport({ image, profile });
    return sendJson(res, 200, result);
  } catch (error) {
    console.error("model_call_failed", error);
    return sendJson(res, 500, { error: `model_call_failed:${safeErrorMessage(error)}` });
  }
}

module.exports = handler;
