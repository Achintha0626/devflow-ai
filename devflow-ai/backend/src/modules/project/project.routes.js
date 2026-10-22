const express = require("express");
const authenticate = require("../../middleware/authenticate");
const validate = require("../../middleware/validate");
const requireWorkspaceMember = require("../../middleware/requireWorkspaceMember");
const requireWorkspaceRole = require("../../middleware/requireWorkspaceRole");
const requireProjectAccess = require("../../middleware/requireProjectAccess");
const {
  create,
  list,
  getById,
  update,
  replaceTechnologies,
  addMember,
  listMembers,
  changeMemberRole,
  removeMember,
  remove,
} = require("./project.controller");
const {
  createProjectSchema,
  updateProjectSchema,
  technologiesSchema,
  addProjectMemberSchema,
  changeProjectMemberRoleSchema,
} = require("./project.validation");

const router = express.Router();
const workspaceProjectManager = requireWorkspaceRole("ADMIN", "PROJECT_MANAGER");

router.post("/:workspaceId/projects", authenticate, requireWorkspaceMember, workspaceProjectManager, validate(createProjectSchema), create);
router.get("/:workspaceId/projects", authenticate, requireWorkspaceMember, list);

router.get("/:workspaceId/projects/:projectId", authenticate, requireWorkspaceMember, requireProjectAccess, getById);
router.patch("/:workspaceId/projects/:projectId", authenticate, requireWorkspaceMember, requireProjectAccess, workspaceProjectManager, validate(updateProjectSchema), update);
router.put("/:workspaceId/projects/:projectId/technologies", authenticate, requireWorkspaceMember, requireProjectAccess, workspaceProjectManager, validate(technologiesSchema), replaceTechnologies);
router.post("/:workspaceId/projects/:projectId/members", authenticate, requireWorkspaceMember, requireProjectAccess, workspaceProjectManager, validate(addProjectMemberSchema), addMember);
router.get("/:workspaceId/projects/:projectId/members", authenticate, requireWorkspaceMember, requireProjectAccess, listMembers);
router.patch("/:workspaceId/projects/:projectId/members/:memberId/role", authenticate, requireWorkspaceMember, requireProjectAccess, workspaceProjectManager, validate(changeProjectMemberRoleSchema), changeMemberRole);
router.delete("/:workspaceId/projects/:projectId/members/:memberId", authenticate, requireWorkspaceMember, requireProjectAccess, requireWorkspaceRole("ADMIN"), removeMember);
router.delete("/:workspaceId/projects/:projectId", authenticate, requireWorkspaceMember, requireProjectAccess, requireWorkspaceRole("ADMIN"), remove);

module.exports = router;
