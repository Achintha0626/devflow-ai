const { resolveGeminiModel } = require("../../config/gemini");

const redactDiagnosticText = (value) => {
  let text = String(value)
    .replace(/(authorization\s*[:=]\s*)[^\r\n,;]+/gi, "$1[REDACTED]")
    .replace(/(bearer\s+)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/((?:api[_-]?)?key|bearer|token|secret|password)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/AIza[0-9A-Za-z_-]+/g, "[REDACTED_API_KEY]");

  if (process.env.GEMINI_API_KEY) {
    text = text.split(process.env.GEMINI_API_KEY).join("[REDACTED_API_KEY]");
  }

  return text.slice(0, 1000);
};

const sanitizeModelAttempt = (attempt) => ({
  model: redactDiagnosticText(attempt.model),
  role: attempt.role,
  status: attempt.status,
  name: redactDiagnosticText(attempt.name || "Error"),
  message: redactDiagnosticText(attempt.message || "Unknown Gemini error"),
});

const logSuccessfulFallbacks = (modelAttempts) => {
  modelAttempts.forEach((attempt) => {
    console.warn("[AI] Gemini model attempt failed", {
      provider: "Gemini",
      ...sanitizeModelAttempt(attempt),
    });
  });
};

const logGenerationFailure = (error) => {
  const diagnostic = {
    provider: "Gemini",
    model: redactDiagnosticText(error?.geminiModel || resolveGeminiModel()),
    role: error?.geminiModelRole || "primary",
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    name: redactDiagnosticText(error?.name || "Error"),
    message: redactDiagnosticText(error?.message || "Unknown Gemini error"),
    code: error?.code === undefined ? undefined : redactDiagnosticText(error.code),
    status: error?.status ?? error?.statusCode ?? error?.response?.status,
  };

  if (Array.isArray(error?.geminiModelAttempts)) {
    diagnostic.modelAttempts = error.geminiModelAttempts.map(sanitizeModelAttempt);
  }

  if (Array.isArray(error?.validationIssues)) {
    diagnostic.validationIssues = error.validationIssues.map((issue) => ({
      path: redactDiagnosticText(Array.isArray(issue?.path) ? issue.path.join(".") : issue?.path || ""),
      code: redactDiagnosticText(issue?.code || ""),
      message: redactDiagnosticText(issue?.message || ""),
    }));
  }

  console.error("[AI] Gemini generation failed", diagnostic);
  if (process.env.NODE_ENV !== "production" && error?.stack) {
    console.error(redactDiagnosticText(error.stack));
  }
};

module.exports = { logGenerationFailure, logSuccessfulFallbacks };
