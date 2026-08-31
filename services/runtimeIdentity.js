const packageJson = require("../package.json");

const serverStartedAt = new Date().toISOString();
const DEFAULT_BUILD_ID = "v0.9.2-final";
const buildId = String(process.env.XINLING_BUILD_ID || DEFAULT_BUILD_ID).trim();
const runtimeVersion = `${packageJson.version}+${buildId}`;

module.exports = { DEFAULT_BUILD_ID, buildId, runtimeVersion, serverStartedAt };
