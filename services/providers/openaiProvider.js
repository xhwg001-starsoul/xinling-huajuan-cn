const { generateTeacherReport } = require("../../model-adapters");

async function generateAnalysis({ image, profile, modelConfig, modelRuntimeConfig }) {
  return generateTeacherReport({ image, profile, modelConfig, modelRuntimeConfig });
}

module.exports = {
  generateAnalysis,
};
