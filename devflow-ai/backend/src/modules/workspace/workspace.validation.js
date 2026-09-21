const { z } = require("zod");

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
}).strict();

module.exports = {
  createWorkspaceSchema,
};