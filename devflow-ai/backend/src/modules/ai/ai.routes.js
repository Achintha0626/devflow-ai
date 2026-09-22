const express = require("express");
const authenticate = require("../../middleware/authenticate");
const validate = require("../../middleware/validate");
const requireWorkspaceMember = require("../../middleware/requireWorkspaceMember");
const requireProjectAccess = require("../../middleware/requireProjectAccess");
const requireProjectManagement = require("../../middleware/requireProjectManagement");
const {
  createGeneration,
  list,
  getById,
  review,
} = require("./ai.controller");
const { reviewSuggestionSchema } = require("./ai.validation");

const router = express.Router();
const projectContext = [authenticate, requireWorkspaceMember, requireProjectAccess];
const projectManagement = [...projectContext, requireProjectManagement];

router.post(
  "/:workspaceId/projects/:projectId/requirements/:requirementId/ai/generate",
  ...projectManagement,
  createGeneration,
);
router.get(
  "/:workspaceId/projects/:projectId/requirements/:requirementId/ai/generations",
  ...projectContext,
  list,
);
router.get(
  "/:workspaceId/projects/:projectId/requirements/:requirementId/ai/generations/:generationId",
  ...projectContext,
  getById,
);
router.patch(
  "/:workspaceId/projects/:projectId/requirements/:requirementId/ai/suggestions/:suggestionId",
  ...projectManagement,
  validate(reviewSuggestionSchema),
  review,
);

module.exports = router;
