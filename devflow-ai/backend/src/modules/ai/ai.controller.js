const {
  generateSuggestions,
  listGenerations,
  getGeneration,
  reviewSuggestion,
} = require("./ai.service");

const internalError = (res, error) => {
  console.error(error);
  return res.status(500).json({ success: false, message: "Internal server error" });
};

const sendEvent = (res, event, data) => {
  if (res.destroyed || res.writableEnded) return;
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  res.flush?.();
};

const getGenerationErrorResponse = (error) => {
  if (error.message === "REQUIREMENT_NOT_FOUND") {
    return { status: 404, message: "Requirement not found", phase: error.generationPhase };
  }
  if (error.message === "AI_GENERATION_FAILED") {
    return { status: 502, message: "AI suggestion generation failed", phase: error.generationPhase };
  }
  return { status: 500, message: "Internal server error", phase: error.generationPhase };
};

const createGeneration = async (req, res) => {
  const isEventStream = req.get("accept")?.includes("text/event-stream");
  if (isEventStream) {
    res.status(200);
    res.set({
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    const keepAlive = setInterval(() => {
      if (!res.destroyed && !res.writableEnded) res.write(": keep-alive\n\n");
    }, 15000);

    try {
      const generation = await generateSuggestions({
        projectId: req.project.id,
        requirementId: req.params.requirementId,
        userId: req.user.id,
        onProgress: (progress) => sendEvent(res, "progress", progress),
      });
      sendEvent(res, "complete", {
        success: true,
        message: "AI suggestions generated successfully",
        data: generation,
      });
    } catch (error) {
      if (error.message !== "REQUIREMENT_NOT_FOUND" && error.message !== "AI_GENERATION_FAILED") {
        console.error(error);
      }
      sendEvent(res, "failure", getGenerationErrorResponse(error));
    } finally {
      clearInterval(keepAlive);
      if (!res.destroyed && !res.writableEnded) res.end();
    }
    return;
  }

  try {
    const generation = await generateSuggestions({
      projectId: req.project.id,
      requirementId: req.params.requirementId,
      userId: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "AI suggestions generated successfully",
      data: generation,
    });
  } catch (error) {
    const response = getGenerationErrorResponse(error);
    if (response.status === 404 || response.status === 502) {
      return res.status(response.status).json({ success: false, message: response.message });
    }
    return internalError(res, error);
  }
};

const list = async (req, res) => {
  try {
    const generations = await listGenerations({
      projectId: req.project.id,
      requirementId: req.params.requirementId,
    });
    return res.status(200).json({ success: true, data: generations });
  } catch (error) {
    if (error.message === "REQUIREMENT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Requirement not found" });
    }
    return internalError(res, error);
  }
};

const getById = async (req, res) => {
  try {
    const generation = await getGeneration({
      projectId: req.project.id,
      requirementId: req.params.requirementId,
      generationId: req.params.generationId,
    });

    if (!generation) {
      return res.status(404).json({ success: false, message: "AI generation not found" });
    }
    return res.status(200).json({ success: true, data: generation });
  } catch (error) {
    return internalError(res, error);
  }
};

const review = async (req, res) => {
  try {
    const suggestion = await reviewSuggestion({
      projectId: req.project.id,
      requirementId: req.params.requirementId,
      suggestionId: req.params.suggestionId,
      changes: req.body,
    });

    return res.status(200).json({
      success: true,
      message: "AI suggestion updated successfully",
      data: suggestion,
    });
  } catch (error) {
    if (error.message === "SUGGESTION_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "AI suggestion not found" });
    }
    return internalError(res, error);
  }
};

module.exports = {
  createGeneration,
  list,
  getById,
  review,
};
