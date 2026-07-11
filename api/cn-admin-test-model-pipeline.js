const { sendJson, getBearerToken, sendSafeError } = require("./_http");
const { testModelPipeline } = require("../services/modelConnectionTestService");

async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" });
  try {
    return sendJson(res, 200, { ok: true, result: await testModelPipeline(getBearerToken(req)) });
  } catch (error) {
    return sendSafeError(res, error, "cn_admin_test_model_pipeline_failed");
  }
}

module.exports = handler;
