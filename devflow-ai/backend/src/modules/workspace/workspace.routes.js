const express = require("express");
const authenticate = require("../../middleware/authenticate");
const validate = require("../../middleware/validate");
const requireWorkspaceMember = require("../../middleware/requireWorkspaceMember");
const requireWorkspaceRole = require("../../middleware/requireWorkspaceRole");
const {
  create,
  list,
  getById,
  adminCheck,
} = require("./workspace.controller");
const { createWorkspaceSchema } = require("./workspace.validation");

const router = express.Router();

router.post("/", authenticate, validate(createWorkspaceSchema), create);
router.get("/", authenticate, list);
router.get("/:workspaceId/admin-check", authenticate, requireWorkspaceMember, requireWorkspaceRole("ADMIN"), adminCheck);
router.get("/:workspaceId", authenticate, getById);

module.exports = router;