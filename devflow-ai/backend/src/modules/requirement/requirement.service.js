const prisma = require("../../config/prisma");

const safeRequirementSelect = {
  id: true,
  projectId: true,
  title: true,
  description: true,
  technologies: true,
  status: true,
  priority: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
    },
  },
  project: {
    select: {
      technologies: {
        select: { name: true, category: true },
        orderBy: { name: "asc" },
      },
    },
  },
};

const createRequirement = async ({ projectId, userId, title, description, priority, status, technologies }) => prisma.requirement.create({
  data: {
    projectId,
    title,
    description,
    createdById: userId,
    ...(priority !== undefined ? { priority } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(technologies !== undefined ? { technologies } : {}),
  },
  select: safeRequirementSelect,
});

const listProjectRequirements = async ({ projectId, status, priority }) => {
  const requirements = await prisma.requirement.findMany({
    where: {
      projectId,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: safeRequirementSelect,
  });

  return requirements;
};

const getRequirement = async ({ projectId, requirementId }) => prisma.requirement.findFirst({
  where: { id: requirementId, projectId },
  select: safeRequirementSelect,
});

const updateRequirement = async ({ projectId, requirementId, title, description, status, priority, technologies }) => {
  const existing = await prisma.requirement.findFirst({
    where: { id: requirementId, projectId },
    select: { id: true },
  });

  if (!existing) throw new Error("REQUIREMENT_NOT_FOUND");

  const data = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (status !== undefined) data.status = status;
  if (priority !== undefined) data.priority = priority;
  if (technologies !== undefined) data.technologies = technologies;

  const result = await prisma.requirement.updateMany({
    where: { id: requirementId, projectId },
    data,
  });

  if (result.count !== 1) throw new Error("REQUIREMENT_NOT_FOUND");

  return prisma.requirement.findFirst({
    where: { id: requirementId, projectId },
    select: safeRequirementSelect,
  });
};

const deleteRequirement = async ({ projectId, requirementId }) => {
  const result = await prisma.requirement.deleteMany({
    where: { id: requirementId, projectId },
  });

  if (result.count !== 1) throw new Error("REQUIREMENT_NOT_FOUND");
};

module.exports = {
  createRequirement,
  listProjectRequirements,
  getRequirement,
  updateRequirement,
  deleteRequirement,
};
