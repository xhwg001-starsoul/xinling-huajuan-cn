const path = require("node:path");
const fs = require("node:fs");
const dotenv = require("dotenv");

const rootDir = path.resolve(__dirname, "..");
const defaultSchoolEnvPath = process.platform === "win32"
  ? "C:\\ProgramData\\XinlingHuajuan\\config\\app.env"
  : path.join(rootDir, "school-data", "config", "app.env");

function loadRuntimeConfig() {
  dotenv.config({ path: path.join(rootDir, ".env"), quiet: true });
  dotenv.config({ path: path.join(rootDir, ".env.local"), override: true, quiet: true });
  if (!process.env.APP_MODE && fs.existsSync(defaultSchoolEnvPath)) {
    dotenv.config({ path: defaultSchoolEnvPath, override: true, quiet: true });
  }
  const { appEnvPath, appMode, ensureDataDirectories } = require("../services/dataPaths");
  ensureDataDirectories();
  if (appMode === "school") {
    dotenv.config({ path: appEnvPath, override: true, quiet: true });
  }
}

module.exports = {
  loadRuntimeConfig,
};
