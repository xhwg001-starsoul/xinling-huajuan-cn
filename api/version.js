const { sendJson } = require("./_http");
const packageJson = require("../package.json");

async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });
  return sendJson(res, 200, {
    application: "xinling-huajuan-cn",
    version: packageJson.version,
    minimumNodeVersion: packageJson.engines?.node || ">=20",
  });
}

module.exports = handler;
