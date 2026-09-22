const { z } = require("zod");

const sprintStatusSchema = z.enum(["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"]);
const dateSchema = z.coerce.date().nullable().optional();

const createSprintSchema = z.object({
  name: z.string().trim().min(2).max(100),
  goal: z.string().trim().max(1000).nullable().optional(),
  startDate: dateSchema,
  endDate: dateSchema,
}).strict().superRefine((value, context) => {
  if (value.startDate && value.endDate && value.endDate <= value.startDate) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "endDate must be after startDate" });
  }
});

const updateSprintSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  goal: z.string().trim().max(1000).nullable().optional(),
  startDate: dateSchema,
  endDate: dateSchema,
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one sprint field must be provided",
});

const sprintFilterSchema = z.object({
  status: sprintStatusSchema.optional(),
}).strict();

const taskIdSchema = z.object({ taskId: z.string().uuid() }).strict();
const sprintMoveSchema = z.object({ sprintId: z.string().uuid().nullable() }).strict();

const backlogFilterSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  type: z.enum(["FRONTEND", "BACKEND", "DATABASE", "DEVOPS", "TESTING", "DESIGN", "DOCUMENTATION", "BUG", "OTHER"]).optional(),
  assigneeId: z.string().uuid().optional(),
}).strict();

module.exports = {
  createSprintSchema,
  updateSprintSchema,
  sprintFilterSchema,
  taskIdSchema,
  sprintMoveSchema,
  backlogFilterSchema,
};
