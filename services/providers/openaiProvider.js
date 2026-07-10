const { generateTeacherReport } = require("../../model-adapters");

async function generateAnalysis({ image, profile, modelConfig }) {
  return generateTeacherReport({ image, profile, modelConfig });
}

module.exports = {
  generateAnalysis,
};
