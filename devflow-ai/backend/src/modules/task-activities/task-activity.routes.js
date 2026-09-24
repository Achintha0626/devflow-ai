const express = require("express");
const authenticate = require("../../middleware/authenticate");
const requireWorkspaceMember = require("../../middleware/requireWorkspaceMember");
const requireProjectAccess = require("../../middleware/requireProjectAccess");
const { list } = require("./task-activity.controller");

const router = express.Router();

router.get(
  "/:workspaceId/projects/:projectId/tasks/:taskId/activities",
  authenticate,
  requireWorkspaceMember,
  requireProjectAccess,
  list,
);

module.exports = router;
