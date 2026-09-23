const express = require("express");
const authenticate = require("../../middleware/authenticate");
const validate = require("../../middleware/validate");
const requireWorkspaceMember = require("../../middleware/requireWorkspaceMember");
const requireProjectAccess = require("../../middleware/requireProjectAccess");
const {
  create,
  list,
  getById,
  update,
  remove,
} = require("./comment.controller");
const { createCommentSchema, updateCommentSchema } = require("./comment.validation");

const router = express.Router();
const projectContext = [authenticate, requireWorkspaceMember, requireProjectAccess];

router.post(
  "/:workspaceId/projects/:projectId/tasks/:taskId/comments",
  ...projectContext,
  validate(createCommentSchema),
  create,
);
router.get(
  "/:workspaceId/projects/:projectId/tasks/:taskId/comments",
  ...projectContext,
  list,
);
router.get(
  "/:workspaceId/projects/:projectId/tasks/:taskId/comments/:commentId",
  ...projectContext,
  getById,
);
router.patch(
  "/:workspaceId/projects/:projectId/tasks/:taskId/comments/:commentId",
  ...projectContext,
  validate(updateCommentSchema),
  update,
);
router.delete(
  "/:workspaceId/projects/:projectId/tasks/:taskId/comments/:commentId",
  ...projectContext,
  remove,
);

module.exports = router;
