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
  addMember,
  listMembers,
  changeMemberRole,
  removeMember,
} = require("./workspace.controller");
const {
  createWorkspaceSchema,
  addWorkspaceMemberSchema,
  changeWorkspaceMemberRoleSchema,
} = require("./workspace.validation");

const router = express.Router();

router.post("/", authenticate, validate(createWorkspaceSchema), create);
router.get("/", authenticate, list);
router.post("/:workspaceId/members", authenticate, requireWorkspaceMember, requireWorkspaceRole("ADMIN"), validate(addWorkspaceMemberSchema), addMember);
router.get("/:workspaceId/members", authenticate, requireWorkspaceMember, listMembers);
router.patch("/:workspaceId/members/:memberId/role", authenticate, requireWorkspaceMember, requireWorkspaceRole("ADMIN"), validate(changeWorkspaceMemberRoleSchema), changeMemberRole);
router.delete("/:workspaceId/members/:memberId", authenticate, requireWorkspaceMember, requireWorkspaceRole("ADMIN"), removeMember);
router.get("/:workspaceId/admin-check", authenticate, requireWorkspaceMember, requireWorkspaceRole("ADMIN"), adminCheck);
router.get("/:workspaceId", authenticate, getById);

module.exports = router;