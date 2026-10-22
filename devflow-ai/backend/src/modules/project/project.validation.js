const { z } = require("zod");

const projectStatusSchema = z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]);
const projectRoleSchema = z.enum(["PROJECT_MANAGER", "DEVELOPER", "QA"]);

const dateSchema = z.coerce.date();

const technologySchema = z.object({
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().max(50).optional(),
}).strict();

const uniqueTechnologies = (technologies, context) => {
  const names = new Set();
  technologies.forEach((technology, index) => {
    const normalizedName = technology.name.toLowerCase();
    if (names.has(normalizedName)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["technologies", index, "name"],
        message: "Technology names must be unique",
      });
    }
    names.add(normalizedName);
  });
};

const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(150),
  key: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9]{1,9}$/, "Project key must be 2 to 10 uppercase letters or numbers"),
  description: z.string().trim().max(1000).optional(),
  startDate: dateSchema.optional(),
  deadline: dateSchema.optional(),
  technologies: z.array(technologySchema).max(50).optional(),
}).strict().superRefine((value, context) => {
  if (value.startDate && value.deadline && value.deadline < value.startDate) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["deadline"], message: "Deadline cannot be earlier than startDate" });
  }
  if (value.technologies) uniqueTechnologies(value.technologies, context);
});

const updateProjectSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  status: projectStatusSchema.optional(),
  startDate: dateSchema.nullable().optional(),
  deadline: dateSchema.nullable().optional(),
}).strict().superRefine((value, context) => {
  if (value.startDate && value.deadline && value.deadline < value.startDate) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["deadline"], message: "Deadline cannot be earlier than startDate" });
  }
});

const technologiesSchema = z.object({
  technologies: z.array(technologySchema).max(50),
}).strict().superRefine((value, context) => uniqueTechnologies(value.technologies, context));

const addProjectMemberSchema = z.object({
  userId: z.string().uuid(),
  role: projectRoleSchema,
}).strict();

const changeProjectMemberRoleSchema = z.object({
  role: projectRoleSchema,
}).strict();

module.exports = {
  projectStatusSchema,
  createProjectSchema,
  updateProjectSchema,
  technologiesSchema,
  addProjectMemberSchema,
  changeProjectMemberRoleSchema,
};
