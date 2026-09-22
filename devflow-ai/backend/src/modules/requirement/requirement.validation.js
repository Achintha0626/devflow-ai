const { z } = require("zod");

const requirementStatusSchema = z.enum(["DRAFT", "READY", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
const requirementPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

const createRequirementSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(1).max(5000),
  priority: requirementPrioritySchema.optional(),
  status: requirementStatusSchema.optional(),
}).strict();

const updateRequirementSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().min(1).max(5000).optional(),
  priority: requirementPrioritySchema.optional(),
  status: requirementStatusSchema.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one requirement field must be provided",
});

const requirementFiltersSchema = z.object({
  status: requirementStatusSchema.optional(),
  priority: requirementPrioritySchema.optional(),
}).strict();

module.exports = {
  createRequirementSchema,
  updateRequirementSchema,
  requirementFiltersSchema,
};
