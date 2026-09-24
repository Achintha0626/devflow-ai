const express = require("express");
const authenticate = require("../../middleware/authenticate");
const requireWorkspaceMember = require("../../middleware/requireWorkspaceMember");
const requireProjectAccess = require("../../middleware/requireProjectAccess");
const { get } = require("./dashboard.controller");

const router = express.Router();

router.get(
  "/:workspaceId/projects/:projectId/dashboard",
  authenticate,
  requireWorkspaceMember,
  requireProjectAccess,
  get,
);

module.exports = router;
