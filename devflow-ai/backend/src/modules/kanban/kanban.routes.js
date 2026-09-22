const express = require("express");
const authenticate = require("../../middleware/authenticate");
const requireWorkspaceMember = require("../../middleware/requireWorkspaceMember");
const requireProjectAccess = require("../../middleware/requireProjectAccess");
const { get } = require("./kanban.controller");

const router = express.Router();

router.get(
  "/:workspaceId/projects/:projectId/kanban",
  authenticate,
  requireWorkspaceMember,
  requireProjectAccess,
  get,
);
router.get(
  "/:workspaceId/projects/:projectId/sprints/:sprintId/kanban",
  authenticate,
  requireWorkspaceMember,
  requireProjectAccess,
  get,
);

module.exports = router;
