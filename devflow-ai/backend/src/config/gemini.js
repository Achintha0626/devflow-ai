const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
const resolveGeminiModel = (configuredModel = process.env.GEMINI_MODEL) =>
  configuredModel?.trim() || DEFAULT_GEMINI_MODEL;

module.exports = {
  DEFAULT_GEMINI_MODEL,
  resolveGeminiModel,
};
