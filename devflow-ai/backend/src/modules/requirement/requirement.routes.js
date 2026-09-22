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
  remove,
} = require("./requirement.controller");
const {
  createRequirementSchema,
  updateRequirementSchema,
} = require("./requirement.validation");

const router = express.Router();
const projectContext = [authenticate, requireWorkspaceMember, requireProjectAccess];
const projectManagement = [...projectContext, requireProjectManagement];

router.post(
  "/:workspaceId/projects/:projectId/requirements",
  ...projectManagement,
  validate(createRequirementSchema),
  create,
);
router.get(
  "/:workspaceId/projects/:projectId/requirements",
  ...projectContext,
  list,
);
router.get(
  "/:workspaceId/projects/:projectId/requirements/:requirementId",
  ...projectContext,
  getById,
);
router.patch(
  "/:workspaceId/projects/:projectId/requirements/:requirementId",
  ...projectManagement,
  validate(updateRequirementSchema),
  update,
);
router.delete(
  "/:workspaceId/projects/:projectId/requirements/:requirementId",
  ...projectManagement,
  remove,
);

module.exports = router;
