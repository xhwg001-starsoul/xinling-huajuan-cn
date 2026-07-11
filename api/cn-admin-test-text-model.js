const { sendJson, getBearerToken, sendSafeError } = require("./_http");
const { testTextModel } = require("../services/modelConnectionTestService");

async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" });
  try {
    return sendJson(res, 200, { ok: true, result: await testTextModel(getBearerToken(req)) });
  } catch (error) {
    return sendSafeError(res, error, "cn_admin_test_text_model_failed");
  }
}

module.exports = handler;
