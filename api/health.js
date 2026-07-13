const { sendJson } = require("./_http");
const { publicHealth } = require("../services/systemStatusService");

async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });
  return sendJson(res, 200, publicHealth());
}

module.exports = handler;
