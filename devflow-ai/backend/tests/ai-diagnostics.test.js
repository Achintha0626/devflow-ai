const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { logGenerationFailure } = require("../src/modules/ai/ai-diagnostics");

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
    assert.match(loggedText, /"apiKeyConfigured":true/);
    assert.match(loggedText, /"status":403/);
    assert.match(loggedText, /Provider rejected key=\[REDACTED\]; Authorization: \[REDACTED\]/);
    assert.doesNotMatch(loggedText, new RegExp(apiKey));
    assert.doesNotMatch(loggedText, new RegExp(bearerToken));
  });
});
