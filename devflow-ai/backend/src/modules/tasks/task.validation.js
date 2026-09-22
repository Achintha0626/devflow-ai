const { z } = require("zod");

const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]);
const taskTypeSchema = z.enum([
  "FRONTEND",
  "BACKEND",
  "DATABASE",
  "DEVOPS",
  "TESTING",
  "DESIGN",
  "DOCUMENTATION",
  "BUG",
  "OTHER",
]);
const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const storyPointsSchema = z.number().int().positive().max(21);
const optionalUuid = z.string().uuid().optional();
const dueDateSchema = z.coerce.date().nullable().optional();

const taskFields = {
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(1).max(5000),
  type: taskTypeSchema,
  priority: taskPrioritySchema,
  storyPoints: storyPointsSchema.nullable().optional(),
  requirementId: optionalUuid.nullable(),
  assigneeId: optionalUuid.nullable(),
  dueDate: dueDateSchema,
};

const createTaskSchema = z.object(taskFields).strict();

const updateTaskSchema = z.object({
  title: taskFields.title.optional(),
  description: taskFields.description.optional(),
  type: taskFields.type.optional(),
  priority: taskFields.priority.optional(),
  storyPoints: taskFields.storyPoints,
  requirementId: taskFields.requirementId,
  assigneeId: taskFields.assigneeId,
  dueDate: taskFields.dueDate,
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one task field must be provided",
});

const updateTaskStatusSchema = z.object({
  status: taskStatusSchema,
}).strict();

const assignTaskSchema = z.object({
  assigneeId: optionalUuid.nullable(),
}).strict();

const convertSuggestionSchema = z.object({
  assigneeId: optionalUuid.nullable(),
  dueDate: dueDateSchema,
}).strict();

const taskQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  type: taskTypeSchema.optional(),
  assigneeId: z.string().uuid().optional(),
  requirementId: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
}).strict();

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  assignTaskSchema,
  convertSuggestionSchema,
  taskQuerySchema,
};
