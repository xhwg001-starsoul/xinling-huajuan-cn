const { sendJson } = require("./_http");
const packageJson = require("../package.json");
const { buildId, runtimeVersion, serverStartedAt } = require("../services/runtimeIdentity");

async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });
  return sendJson(res, 200, {
    application: "xinling-huajuan-cn",
    version: packageJson.version,
    runtimeVersion,
    buildId,
    serverStartedAt,
    minimumNodeVersion: packageJson.engines?.node || ">=20",
  });
}

module.exports = handler;
