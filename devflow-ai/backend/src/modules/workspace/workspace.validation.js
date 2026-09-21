const { z } = require("zod");

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
}).strict();

const workspaceRoleSchema = z.enum(["ADMIN", "PROJECT_MANAGER", "DEVELOPER", "QA"]);

const addWorkspaceMemberSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  role: workspaceRoleSchema,
}).strict();

const changeWorkspaceMemberRoleSchema = z.object({
  role: workspaceRoleSchema,
}).strict();

module.exports = {
  createWorkspaceSchema,
  addWorkspaceMemberSchema,
  changeWorkspaceMemberRoleSchema,
};