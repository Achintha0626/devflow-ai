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

const createGeneration = async (req, res) => {
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
    if (error.message === "REQUIREMENT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Requirement not found" });
    }
    if (error.message === "AI_GENERATION_FAILED") {
      return res.status(502).json({ success: false, message: "AI suggestion generation failed" });
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
