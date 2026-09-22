const prisma = require("../../config/prisma");
const { generateTaskSuggestions, GEMINI_MODEL, PROMPT_VERSION } = require("../../services/gemini.service");

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
  createdById: true,
  createdAt: true,
  createdBy: { select: safeCreatorSelect },
  suggestions: {
    orderBy: { createdAt: "asc" },
    select: safeSuggestionSelect,
  },
};

const redactDiagnosticText = (value) => String(value)
  .replace(/(api[_-]?key|authorization|bearer|token|secret|password)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
  .replace(/AIza[0-9A-Za-z_-]+/g, "[REDACTED_API_KEY]");

const logGenerationFailure = (error) => {
  if (process.env.NODE_ENV === "production") return;

  const diagnostic = {
    name: error?.name,
    message: error?.message ? redactDiagnosticText(error.message) : "Unknown Gemini error",
    code: error?.code,
    status: error?.status ?? error?.statusCode,
  };

  if (Array.isArray(error?.validationIssues)) {
    diagnostic.validationIssues = error.validationIssues;
  }

  console.error("[AI] Gemini generation failed", diagnostic);
  if (error?.stack) console.error(redactDiagnosticText(error.stack));
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
      priority: true,
      project: {
        select: {
          id: true,
          name: true,
          description: true,
          technologies: { select: { name: true, category: true }, orderBy: { name: "asc" } },
        },
      },
    },
  });

  if (!requirement) throw new Error("REQUIREMENT_NOT_FOUND");
  return { requirement, project: requirement.project };
};

const generateSuggestions = async ({ projectId, requirementId, userId }) => {
  const context = await getGenerationContext({ projectId, requirementId });
  const generation = await prisma.aIGeneration.create({
    data: {
      requirementId,
      model: GEMINI_MODEL,
      promptVersion: PROMPT_VERSION,
      createdById: userId,
    },
  });

  try {
    const { tasks, model } = await generateTaskSuggestions(context);
    const completedGeneration = await prisma.$transaction(async (tx) => {
      await tx.aISuggestedTask.createMany({
        data: tasks.map((task) => ({
          aiGenerationId: generation.id,
          title: task.title,
          description: task.description,
          type: task.type,
          priority: task.priority,
          complexity: task.complexity,
          estimatedStoryPoints: task.estimatedStoryPoints,
          acceptanceCriteria: task.acceptanceCriteria,
        })),
      });

      await tx.aIGeneration.update({
        where: { id: generation.id },
        data: { model, status: "COMPLETED" },
      });

      return tx.aIGeneration.findUnique({
        where: { id: generation.id },
        select: safeGenerationSelect,
      });
    });

    return completedGeneration;
  } catch (error) {
    logGenerationFailure(error);
    await prisma.aIGeneration.update({
      where: { id: generation.id },
      data: { status: "FAILED", errorMessage: safeGenerationError(error) },
    }).catch(() => undefined);
    throw new Error("AI_GENERATION_FAILED");
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
