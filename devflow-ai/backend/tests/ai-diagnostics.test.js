const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  logGenerationFailure,
  logGenerationPerformance,
  logSuccessfulFallbacks,
} = require("../src/modules/ai/ai-diagnostics");
const { DEFAULT_GEMINI_MODEL, resolveGeminiModel } = require("../src/config/gemini");
const {
  GEMINI_MODEL,
  MAX_OUTPUT_TOKENS,
  PROMPT_VERSION,
  buildPrompt,
  generationConfig,
  getConfiguredModels,
  processGeminiResponse,
  requestWithRetries,
} = require("../src/services/gemini.service");

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
  it("uses Gemini 3.8 Flash as the default and respects explicit model configuration", () => {
    assert.equal(DEFAULT_GEMINI_MODEL, "gemini-3.8-flash");
    assert.equal(resolveGeminiModel(undefined), DEFAULT_GEMINI_MODEL);
    assert.equal(resolveGeminiModel(" custom-model "), "custom-model");
  });

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

describe("Gemini generation request efficiency", () => {
  it("uses one structured response with a bounded output size", () => {
    assert.equal(PROMPT_VERSION, "v3");
    assert.equal(generationConfig.responseMimeType, "application/json");
    assert.equal(generationConfig.maxOutputTokens, MAX_OUTPUT_TOKENS);
    assert.ok(generationConfig.responseSchema);
    assert.equal(generationConfig.responseSchema.properties.tasks.items.properties.acceptanceCriteria.type, "ARRAY");
  });

  it("makes one Gemini request when the provider succeeds", async () => {
    const calls = [];
    const metrics = { geminiRequests: 0, geminiApiResponseMs: 0, geminiRetries: 0 };
    const expectedResponse = { text: '{"tasks":[]}' };
    const client = {
      models: {
        generateContent: async (request) => {
          calls.push(request);
          return expectedResponse;
        },
      },
    };

    const response = await requestWithRetries({
      client,
      model: GEMINI_MODEL,
      contents: "test",
      metrics,
    });

    assert.equal(response, expectedResponse);
    assert.equal(calls.length, 1);
    assert.equal(metrics.geminiRequests, 1);
    assert.equal(calls[0].config.maxOutputTokens, MAX_OUTPUT_TOKENS);
  });

  it("keeps the prompt focused on technologies and the selected requirement", () => {
    const prompt = buildPrompt({
      project: {
        name: "irrelevant project name",
        description: "irrelevant project description",
        technologies: [{ name: "React", category: "Frontend" }],
      },
      requirement: {
        title: "Add planner history",
        description: "Persist generated suggestions for later review.",
        priority: "HIGH",
        technologies: [],
      },
    });

    assert.match(prompt, /Frontend: React/);
    assert.match(prompt, /Add planner history/);
    assert.match(prompt, /Persist generated suggestions/);
    assert.doesNotMatch(prompt, /irrelevant project/);
    assert.match(prompt, /acceptance criteria/);
  });

  it("uses the requirement stack instead of unrelated project technologies", () => {
    const prompt = buildPrompt({
      project: {
        technologies: [{ name: "Angular", category: "Frontend" }],
      },
      requirement: {
        title: "Build checkout",
        description: "Accept an order and save it.",
        priority: "HIGH",
        technologies: [
          { category: "Frontend", name: "React" },
          { category: "Backend", name: "Spring Boot" },
          { category: "Database", name: "MySQL" },
        ],
      },
    });

    assert.match(prompt, /Frontend: React/);
    assert.match(prompt, /Backend: Spring Boot/);
    assert.match(prompt, /Database: MySQL/);
    assert.doesNotMatch(prompt, /Angular/);
    assert.match(prompt, /do not recommend unrelated alternatives/);
  });

  it("keeps tasks technology-neutral when no stack is specified", () => {
    const prompt = buildPrompt({
      project: { technologies: [] },
      requirement: {
        title: "Export report",
        description: "Allow report export.",
        priority: "MEDIUM",
        technologies: [],
      },
    });

    assert.match(prompt, /No technology stack was specified/);
    assert.match(prompt, /Keep tasks technology-neutral/);
    assert.doesNotMatch(prompt, /React|Node\.js|PostgreSQL/);
  });

  it("measures response processing separately from schema validation", () => {
    const { tasks, metrics } = processGeminiResponse({
      text: JSON.stringify({
        tasks: [{
          title: "Add planner history",
          description: "Persist generated suggestions for review.",
          type: "BACKEND",
          priority: "HIGH",
          complexity: "Medium",
          estimatedStoryPoints: 3,
          acceptanceCriteria: ["Generation history lists the saved suggestion."],
        }],
      }),
    });

    assert.equal(tasks.length, 1);
    assert.ok(metrics.responseCharacters > 0);
    assert.ok(metrics.responseProcessingMs >= 0);
    assert.ok(metrics.validationMs >= 0);
    assert.equal("responseParsingValidationMs" in metrics, false);
  });

  it("does not retry non-transient Gemini errors", async () => {
    const originalMaxRetries = process.env.GEMINI_MAX_RETRIES;
    let requestCount = 0;
    const metrics = { geminiRequests: 0, geminiApiResponseMs: 0, geminiRetries: 0 };
    const providerError = Object.assign(new Error("Invalid request"), { status: 400 });
    const client = {
      models: {
        generateContent: async () => {
          requestCount += 1;
          throw providerError;
        },
      },
    };

    try {
      process.env.GEMINI_MAX_RETRIES = "3";
      await assert.rejects(
        requestWithRetries({ client, model: GEMINI_MODEL, contents: "test", metrics }),
        providerError
      );
    } finally {
      if (originalMaxRetries === undefined) delete process.env.GEMINI_MAX_RETRIES;
      else process.env.GEMINI_MAX_RETRIES = originalMaxRetries;
    }

    assert.equal(requestCount, 1);
    assert.equal(metrics.geminiRequests, 1);
    assert.equal(metrics.geminiRetries, 0);
    assert.ok(metrics.geminiApiResponseMs >= 0);
  });

  it("counts retries separately from provider request time", async () => {
    const originalMaxRetries = process.env.GEMINI_MAX_RETRIES;
    let requestCount = 0;
    const metrics = { geminiRequests: 0, geminiApiResponseMs: 0, geminiRetries: 0, retryDelayMs: 0 };
    const client = {
      models: {
        generateContent: async () => {
          requestCount += 1;
          if (requestCount === 1) {
            throw Object.assign(new Error("Temporary unavailable"), { status: 503 });
          }
          return { text: '{"tasks":[]}' };
        },
      },
    };

    try {
      process.env.GEMINI_MAX_RETRIES = "1";
      await requestWithRetries({ client, model: GEMINI_MODEL, contents: "test", metrics });
    } finally {
      if (originalMaxRetries === undefined) delete process.env.GEMINI_MAX_RETRIES;
      else process.env.GEMINI_MAX_RETRIES = originalMaxRetries;
    }

    assert.equal(requestCount, 2);
    assert.equal(metrics.geminiRequests, 2);
    assert.equal(metrics.geminiRetries, 1);
    assert.ok(metrics.retryDelayMs > 0);
    assert.ok(metrics.geminiApiResponseMs >= 0);
  });
});

describe("AI generation performance diagnostics", () => {
  it("logs timing and token counts without including unapproved fields", () => {
    const originalConsoleInfo = console.info;
    const logLines = [];
    console.info = (...args) => logLines.push(args);

    try {
      logGenerationPerformance({
        model: GEMINI_MODEL,
        outcome: "completed",
        stage: "completed",
        metrics: {
          promptPreparationMs: 1.234,
          geminiApiResponseMs: 456.789,
          retryDelayMs: 0,
          responseParsingValidationMs: 2,
          databasePersistenceMs: 4,
          geminiRequests: 1,
          geminiRetries: 0,
          fallbackModelsTried: 0,
          promptCharacters: 100,
          responseCharacters: 250,
          promptTokenCount: 20,
          candidateTokenCount: 50,
          totalTokenCount: 70,
          privatePrompt: "must not be logged",
        },
        totalMs: 500,
      });
    } finally {
      console.info = originalConsoleInfo;
    }

    const loggedText = JSON.stringify(logLines);
    assert.match(loggedText, /"geminiRequests":1/);
    assert.match(loggedText, /"responseCharacters":250/);
    assert.match(loggedText, /"promptTokenCount":20/);
    assert.match(loggedText, /"totalMs":500/);
    assert.doesNotMatch(loggedText, /must not be logged/);
  });
});
