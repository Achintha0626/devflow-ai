const { z } = require("zod");

const suggestedTaskTypeSchema = z.enum([
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
const requirementPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const suggestedTaskStatusSchema = z.enum(["APPROVED", "REJECTED", "EDITED"]);
const storyPointsSchema = z.number().int().refine((value) => [1, 2, 3, 5, 8, 13, 21].includes(value), {
  message: "Estimated story points must be one of 1, 2, 3, 5, 8, 13, or 21",
});

const generatedTaskSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(1).max(2000),
  type: suggestedTaskTypeSchema,
  priority: requirementPrioritySchema,
  complexity: z.string().trim().min(1).max(50),
  estimatedStoryPoints: storyPointsSchema,
  acceptanceCriteria: z.array(z.string().trim().min(1).max(300)).min(1).max(10),
}).strict();

const generatedTasksResponseSchema = z.object({
  tasks: z.array(generatedTaskSchema).min(1).max(20),
}).strict();

const editableSuggestionFields = [
  "title",
  "description",
  "type",
  "priority",
  "complexity",
  "estimatedStoryPoints",
  "acceptanceCriteria",
];

const reviewSuggestionSchema = z.object({
  status: suggestedTaskStatusSchema,
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().min(1).max(2000).optional(),
  type: suggestedTaskTypeSchema.optional(),
  priority: requirementPrioritySchema.optional(),
  complexity: z.string().trim().min(1).max(50).optional(),
  estimatedStoryPoints: storyPointsSchema.optional(),
  acceptanceCriteria: z.array(z.string().trim().min(1).max(300)).min(1).max(10).optional(),
}).strict().superRefine((value, context) => {
  if (value.status === "EDITED" && !editableSuggestionFields.some((field) => value[field] !== undefined)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["status"],
      message: "EDITED requires at least one editable suggestion field",
    });
  }
});

module.exports = {
  generatedTasksResponseSchema,
  reviewSuggestionSchema,
};
