const { performance } = require("node:perf_hooks");
const prisma = require("../../config/prisma");
const { generateTaskSuggestions, GEMINI_MODEL, PROMPT_VERSION } = require("../../services/gemini.service");
const {
  logGenerationFailure,
  logGenerationPerformance,
} = require("./ai-diagnostics");
const { createGenerationProgressReporter } = require("./generation-progress");

const safeSuggestionSelect = {
  id: true,
  aiGenerationId: true,
  title: true,
  description: true,
  type: true,
  priority: true,
  complexity: true,
  estimatedStoryPoints: true,
  acceptanceCriteria: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

const safeCreatorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
};

const safeGenerationSelect = {
  id: true,
  requirementId: true,
  model: true,
  promptVersion: true,
  status: true,
  errorMessage: true,
  technologySnapshot: true,
  createdById: true,
  createdAt: true,
  createdBy: { select: safeCreatorSelect },
  suggestions: {
    orderBy: { createdAt: "asc" },
    select: safeSuggestionSelect,
  },
};

const safeGenerationError = (error) => {
  const knownErrors = new Set([
    "GEMINI_NOT_CONFIGURED",
    "GEMINI_EMPTY_RESPONSE",
    "GEMINI_INVALID_JSON",
    "GEMINI_INVALID_OUTPUT",
  ]);
  return knownErrors.has(error.message) ? error.message.replace("GEMINI_", "").toLowerCase().replaceAll("_", " ") : "Gemini generation failed";
};

const getGenerationContext = async ({ projectId, requirementId }) => {
  const requirement = await prisma.requirement.findFirst({
    where: { id: requirementId, projectId },
    select: {
      id: true,
      title: true,
      description: true,
      technologies: true,
      priority: true,
      project: {
        select: {
          technologies: { select: { name: true, category: true }, orderBy: { name: "asc" } },
        },
      },
    },
  });

  if (!requirement) throw new Error("REQUIREMENT_NOT_FOUND");
  const requirementTechnologies = Array.isArray(requirement.technologies) ? requirement.technologies : [];
  const projectTechnologies = requirement.project.technologies || [];
  const technologyStack = requirementTechnologies.length ? requirementTechnologies : projectTechnologies;
  return {
    requirement,
    project: { technologies: technologyStack },
    technologyStack,
  };
};

const generateSuggestions = async ({ projectId, requirementId, userId, onProgress }) => {
  const startedAt = performance.now();
  const metrics = {};
  let stage = "requirement_context";
  let generation;
  const progress = createGenerationProgressReporter(onProgress);
  try {
    let operationStartedAt = performance.now();
    progress.report({ phase: "understanding", status: "active" });
    const context = await getGenerationContext({ projectId, requirementId });
    metrics.contextQueryMs = performance.now() - operationStartedAt;
    progress.report({ phase: "understanding", status: "completed" });

    stage = "generation_record";
    progress.report({ phase: "preparing", status: "active" });
    operationStartedAt = performance.now();
    generation = await prisma.aIGeneration.create({
      data: {
        requirementId,
        model: GEMINI_MODEL,
        promptVersion: PROMPT_VERSION,
        technologySnapshot: context.technologyStack,
        createdById: userId,
      },
    });
    metrics.generationRecordMs = performance.now() - operationStartedAt;

    stage = "gemini";
    const { tasks, model, metrics: generationMetrics } = await generateTaskSuggestions({
      ...context,
      onProgress: progress.report,
    });
    Object.assign(metrics, generationMetrics);

    stage = "database_persistence";
    progress.report({ phase: "saving", status: "active" });
    operationStartedAt = performance.now();
    const completedGeneration = await prisma.aIGeneration.update({
      where: { id: generation.id },
      data: {
        model,
        status: "COMPLETED",
        suggestions: {
          createMany: {
            data: tasks.map((task) => ({
              title: task.title,
              description: task.description,
              type: task.type,
              priority: task.priority,
              complexity: task.complexity,
              estimatedStoryPoints: task.estimatedStoryPoints,
              acceptanceCriteria: task.acceptanceCriteria,
            })),
          },
        },
      },
      select: safeGenerationSelect,
    });
    metrics.databasePersistenceMs = performance.now() - operationStartedAt;
    progress.report({ phase: "saving", status: "completed" });
    progress.report({ phase: "ready", status: "active" });
    progress.report({ phase: "ready", status: "completed" });
    logGenerationPerformance({
      model,
      outcome: "completed",
      stage: "completed",
      metrics,
      totalMs: performance.now() - startedAt,
    });

    return completedGeneration;
  } catch (error) {
    const failedPhase = progress.failActive();
    if (failedPhase && error && typeof error === "object") {
      error.generationPhase = failedPhase;
    }
    Object.assign(metrics, error?.geminiMetrics || {});
    if (stage === "gemini") {
      logGenerationFailure(error);
    } else {
      console.error("[AI] Generation request failed", {
        stage,
        name: error?.name || "Error",
        code: error?.code,
        status: error?.status ?? error?.statusCode,
      });
    }

    if (generation) {
      operationStartedAt = performance.now();
      try {
        await prisma.aIGeneration.update({
          where: { id: generation.id },
          data: { status: "FAILED", errorMessage: safeGenerationError(error) },
        });
      } catch (persistenceError) {
        console.error("[AI] Failed to persist generation failure", {
          name: persistenceError?.name || "Error",
          code: persistenceError?.code,
          status: persistenceError?.status ?? persistenceError?.statusCode,
        });
      } finally {
        metrics.databasePersistenceMs = (metrics.databasePersistenceMs || 0)
          + performance.now() - operationStartedAt;
      }
    }

    logGenerationPerformance({
      model: error?.geminiModel || GEMINI_MODEL,
      outcome: "failed",
      stage,
      metrics,
      totalMs: performance.now() - startedAt,
    });
    if (!generation) throw error;
    const generationError = new Error("AI_GENERATION_FAILED");
    generationError.generationPhase = error.generationPhase;
    throw generationError;
  }
};

const listGenerations = async ({ projectId, requirementId }) => {
  const context = await getGenerationContext({ projectId, requirementId });
  return prisma.aIGeneration.findMany({
    where: { requirementId: context.requirement.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: safeGenerationSelect,
  });
};

const getGeneration = async ({ projectId, requirementId, generationId }) => prisma.aIGeneration.findFirst({
  where: {
    id: generationId,
    requirementId,
    requirement: { projectId },
  },
  select: safeGenerationSelect,
});

const reviewSuggestion = async ({ projectId, requirementId, suggestionId, changes }) => {
  const suggestion = await prisma.aISuggestedTask.findFirst({
    where: {
      id: suggestionId,
      aiGeneration: {
        requirementId,
        requirement: { projectId },
      },
    },
    select: { id: true },
  });

  if (!suggestion) throw new Error("SUGGESTION_NOT_FOUND");

  const contentFields = [
    "title",
    "description",
    "type",
    "priority",
    "complexity",
    "estimatedStoryPoints",
    "acceptanceCriteria",
  ];
  const hasContentChanges = contentFields.some((field) => changes[field] !== undefined);
  const data = {};
  contentFields.forEach((field) => {
    if (changes[field] !== undefined) data[field] = changes[field];
  });
  if (changes.status !== undefined || hasContentChanges) {
    data.status = hasContentChanges ? (changes.status || "EDITED") : changes.status;
  }

  return prisma.aISuggestedTask.update({
    where: { id: suggestionId },
    data,
    select: safeSuggestionSelect,
  });
};

module.exports = {
  generateSuggestions,
  listGenerations,
  getGeneration,
  reviewSuggestion,
};
