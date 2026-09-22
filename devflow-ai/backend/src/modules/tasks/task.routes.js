const express = require("express");
const authenticate = require("../../middleware/authenticate");
const validate = require("../../middleware/validate");
const requireWorkspaceMember = require("../../middleware/requireWorkspaceMember");
const requireProjectAccess = require("../../middleware/requireProjectAccess");
const requireProjectManagement = require("../../middleware/requireProjectManagement");
const {
  create,
  list,
  getById,
  update,
  updateStatus,
  assign,
  remove,
  convertSuggestion,
} = require("./task.controller");
const {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  assignTaskSchema,
  convertSuggestionSchema,
} = require("./task.validation");

const router = express.Router();
const projectContext = [authenticate, requireWorkspaceMember, requireProjectAccess];
const projectManagement = [...projectContext, requireProjectManagement];

router.post(
  "/:workspaceId/projects/:projectId/tasks",
  ...projectManagement,
  validate(createTaskSchema),
  create,
);
router.get(
  "/:workspaceId/projects/:projectId/tasks",
  ...projectContext,
  list,
);
router.patch(
  "/:workspaceId/projects/:projectId/tasks/:taskId/status",
  ...projectContext,
  validate(updateTaskStatusSchema),
  updateStatus,
);
router.patch(
  "/:workspaceId/projects/:projectId/tasks/:taskId/assignee",
  ...projectManagement,
  validate(assignTaskSchema),
  assign,
);
router.patch(
  "/:workspaceId/projects/:projectId/tasks/:taskId",
  ...projectManagement,
  validate(updateTaskSchema),
  update,
);
router.get(
  "/:workspaceId/projects/:projectId/tasks/:taskId",
  ...projectContext,
  getById,
);
router.delete(
  "/:workspaceId/projects/:projectId/tasks/:taskId",
  ...projectManagement,
  remove,
);
router.post(
  "/:workspaceId/projects/:projectId/requirements/:requirementId/ai/suggestions/:suggestionId/task",
  ...projectManagement,
  validate(convertSuggestionSchema),
  convertSuggestion,
);

module.exports = router;
