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
  start,
  complete,
  cancel,
  addTask,
  removeTask,
  move,
  backlog,
  progress,
  remove,
} = require("./sprint.controller");
const {
  createSprintSchema,
  updateSprintSchema,
  taskIdSchema,
  sprintMoveSchema,
} = require("./sprint.validation");

const router = express.Router();
const projectContext = [authenticate, requireWorkspaceMember, requireProjectAccess];
const projectManagement = [...projectContext, requireProjectManagement];

router.post("/:workspaceId/projects/:projectId/sprints", ...projectManagement, validate(createSprintSchema), create);
router.get("/:workspaceId/projects/:projectId/sprints", ...projectContext, list);
router.get("/:workspaceId/projects/:projectId/backlog", ...projectContext, backlog);
router.get("/:workspaceId/projects/:projectId/sprints/:sprintId", ...projectContext, getById);
router.get("/:workspaceId/projects/:projectId/sprints/:sprintId/progress", ...projectContext, progress);
router.patch("/:workspaceId/projects/:projectId/sprints/:sprintId", ...projectManagement, validate(updateSprintSchema), update);
router.patch("/:workspaceId/projects/:projectId/sprints/:sprintId/start", ...projectManagement, start);
router.patch("/:workspaceId/projects/:projectId/sprints/:sprintId/complete", ...projectManagement, complete);
router.patch("/:workspaceId/projects/:projectId/sprints/:sprintId/cancel", ...projectManagement, cancel);
router.post("/:workspaceId/projects/:projectId/sprints/:sprintId/tasks", ...projectManagement, validate(taskIdSchema), addTask);
router.delete("/:workspaceId/projects/:projectId/sprints/:sprintId/tasks/:taskId", ...projectManagement, removeTask);
router.patch("/:workspaceId/projects/:projectId/tasks/:taskId/sprint", ...projectManagement, validate(sprintMoveSchema), move);
router.delete("/:workspaceId/projects/:projectId/sprints/:sprintId", ...projectManagement, remove);

module.exports = router;
