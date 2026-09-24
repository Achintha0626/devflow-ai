const express = require("express");
const authenticate = require("../../middleware/authenticate");
const requireWorkspaceMember = require("../../middleware/requireWorkspaceMember");
const requireProjectAccess = require("../../middleware/requireProjectAccess");
const { getRisk } = require("./task-risk.controller");

const router = express.Router();

router.get(
  "/:workspaceId/projects/:projectId/tasks/:taskId/risk",
  authenticate,
  requireWorkspaceMember,
  requireProjectAccess,
  getRisk,
);

module.exports = router;
