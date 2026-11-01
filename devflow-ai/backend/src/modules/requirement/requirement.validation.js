const { z } = require("zod");

const requirementStatusSchema = z.enum(["DRAFT", "READY", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
const requirementPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const technologyCategorySchema = z.enum(["Frontend", "Backend", "Database"]);
const technologySelectionSchema = z.object({
  category: technologyCategorySchema,
  name: z.string().trim().min(1).max(80),
}).strict();
const technologiesSchema = z.array(technologySelectionSchema).max(30).superRefine((technologies, context) => {
  const seen = new Set();
  technologies.forEach(({ category, name }, index) => {
    const key = `${category}:${name.toLowerCase()}`;
    if (seen.has(key)) {
      context.addIssue({
        code: "custom",
        path: [index, "name"],
        message: "Technology must be unique within its category",
      });
    }
    seen.add(key);
  });
});

const createRequirementSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(1).max(5000),
  priority: requirementPrioritySchema.optional(),
  status: requirementStatusSchema.optional(),
  technologies: technologiesSchema.optional(),
}).strict();

const updateRequirementSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().min(1).max(5000).optional(),
  priority: requirementPrioritySchema.optional(),
  status: requirementStatusSchema.optional(),
  technologies: technologiesSchema.optional(),
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
  technologySelectionSchema,
  technologiesSchema,
};
