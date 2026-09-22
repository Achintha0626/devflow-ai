const { z } = require("zod");

const kanbanFiltersSchema = z.object({
  sprintId: z.union([z.literal("backlog"), z.string().uuid()]).optional(),
  assigneeId: z.string().uuid().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  type: z.enum(["FRONTEND", "BACKEND", "DATABASE", "DEVOPS", "TESTING", "DESIGN", "DOCUMENTATION", "BUG", "OTHER"]).optional(),
}).strict();

module.exports = {
  kanbanFiltersSchema,
};
