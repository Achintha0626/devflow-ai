const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { logGenerationFailure, logSuccessfulFallbacks } = require("../src/modules/ai/ai-diagnostics");
const { GEMINI_MODEL, getConfiguredModels } = require("../src/services/gemini.service");

describe("AI generation diagnostics", () => {
  it("logs provider errors in production without exposing credentials", () => {
    const originalEnv = {
      NODE_ENV: process.env.NODE_ENV,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      GEMINI_MODEL: process.env.GEMINI_MODEL,
    };
    const originalConsoleError = console.error;
    const logLines = [];
    const apiKey = "test-gemini-secret-key";
    const bearerToken = "test-bearer-secret";

    process.env.NODE_ENV = "production";
    process.env.GEMINI_API_KEY = apiKey;
    process.env.GEMINI_MODEL = "configured-test-model";
    console.error = (...args) => logLines.push(args);

    try {
      const error = new Error(`Provider rejected key=${apiKey}; Authorization: Bearer ${bearerToken}`);
      error.status = 403;
      error.code = "PROVIDER_REJECTED";
      error.geminiModel = "fallback-test-model";
      error.geminiModelRole = "fallback";
      error.geminiModelAttempts = [
        {
          model: "configured-test-model",
          role: "primary",
          status: 404,
          message: "Primary model not found",
        },
        {
          model: "fallback-test-model",
          role: "fallback",
          status: 403,
          message: `Fallback rejected key=${apiKey}`,
        },
      ];
      logGenerationFailure(error);
    } finally {
      console.error = originalConsoleError;
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }

    const loggedText = JSON.stringify(logLines);
    assert.equal(logLines.length, 1);
    assert.match(loggedText, /configured-test-model/);
    assert.match(loggedText, /fallback-test-model/);
    assert.match(loggedText, /"role":"fallback"/);
    assert.match(loggedText, /"apiKeyConfigured":true/);
    assert.match(loggedText, /"status":403/);
    assert.match(loggedText, /Primary model not found/);
    assert.match(loggedText, /Fallback rejected key=\[REDACTED\]/);
    assert.match(loggedText, /Provider rejected key=\[REDACTED\]; Authorization: \[REDACTED\]/);
    assert.doesNotMatch(loggedText, new RegExp(apiKey));
    assert.doesNotMatch(loggedText, new RegExp(bearerToken));
  });

  it("redacts successful-fallback diagnostics", () => {
    const originalConsoleWarn = console.warn;
    const originalApiKey = process.env.GEMINI_API_KEY;
    const apiKey = "test-gemini-secret-key";
    const logLines = [];
    process.env.GEMINI_API_KEY = apiKey;
    console.warn = (...args) => logLines.push(args);

    try {
      logSuccessfulFallbacks([{
        model: "gemini-fallback",
        role: "primary",
        status: 404,
        message: `model unavailable for key=${apiKey}`,
      }]);
    } finally {
      console.warn = originalConsoleWarn;
      if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalApiKey;
    }

    const loggedText = JSON.stringify(logLines);
    assert.match(loggedText, /gemini-fallback/);
    assert.match(loggedText, /"role":"primary"/);
    assert.match(loggedText, /key=\[REDACTED\]/);
    assert.doesNotMatch(loggedText, new RegExp(apiKey));
  });
});

describe("Gemini fallback model configuration", () => {
  it("uses only the primary model when fallback models are unset or empty", () => {
    const originalFallbackModels = process.env.GEMINI_FALLBACK_MODELS;
    try {
      delete process.env.GEMINI_FALLBACK_MODELS;
      assert.deepEqual(getConfiguredModels(), [GEMINI_MODEL]);

      process.env.GEMINI_FALLBACK_MODELS = " ,  , ";
      assert.deepEqual(getConfiguredModels(), [GEMINI_MODEL]);
    } finally {
      if (originalFallbackModels === undefined) delete process.env.GEMINI_FALLBACK_MODELS;
      else process.env.GEMINI_FALLBACK_MODELS = originalFallbackModels;
    }
  });

  it("uses only explicit, trimmed, unique fallback model names", () => {
    const originalFallbackModels = process.env.GEMINI_FALLBACK_MODELS;
    try {
      process.env.GEMINI_FALLBACK_MODELS = ` ${GEMINI_MODEL}, gemini-supported-fallback, gemini-supported-fallback `;
      assert.deepEqual(getConfiguredModels(), [GEMINI_MODEL, "gemini-supported-fallback"]);
    } finally {
      if (originalFallbackModels === undefined) delete process.env.GEMINI_FALLBACK_MODELS;
      else process.env.GEMINI_FALLBACK_MODELS = originalFallbackModels;
    }
  });
});
