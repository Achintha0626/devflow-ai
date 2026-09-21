const prisma = require("../../config/prisma");

const safeTechnologySelect = {
  id: true,
  name: true,
  category: true,
};

const safeProjectSelect = {
  id: true,
  workspaceId: true,
  name: true,
  key: true,
  description: true,
  status: true,
  startDate: true,
  deadline: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  technologies: { select: safeTechnologySelect, orderBy: { name: "asc" } },
};

const safeProjectMemberSelect = {
  id: true,
  userId: true,
  role: true,
  joinedAt: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
    },
  },
};

const isUniqueConstraintError = (error) => error && error.code === "P2002";

const formatProjectMember = (member) => ({
  membershipId: member.id,
  userId: member.userId,
  firstName: member.user.firstName,
  lastName: member.user.lastName,
  email: member.user.email,
  avatarUrl: member.user.avatarUrl,
  role: member.role,
  joinedAt: member.joinedAt,
});

const createProject = async ({ workspaceId, userId, workspaceRole, name, key, description, startDate, deadline, technologies = [] }) => {
  try {
    const project = await prisma.project.create({
      data: {
        workspaceId,
        name,
        key,
        description,
        startDate,
        deadline,
        createdById: userId,
        technologies: {
          create: technologies.map((technology) => ({
            name: technology.name,
            category: technology.category,
          })),
        },
        ...(workspaceRole === "PROJECT_MANAGER" ? {
          members: {
            create: { userId, role: "PROJECT_MANAGER" },
          },
        } : {}),
      },
      select: safeProjectSelect,
    });

    return project;
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error("PROJECT_KEY_ALREADY_EXISTS");
    throw error;
  }
};

const listWorkspaceProjects = async ({ workspaceId, userId, workspaceRole, status }) => {
  const canSeeAll = workspaceRole === "ADMIN" || workspaceRole === "PROJECT_MANAGER";
  const projects = await prisma.project.findMany({
    where: {
      workspaceId,
      ...(status ? { status } : {}),
      ...(canSeeAll ? {} : { members: { some: { userId } } }),
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      workspaceId: true,
      name: true,
      key: true,
      description: true,
      status: true,
      startDate: true,
      deadline: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
      technologies: { select: safeTechnologySelect, orderBy: { name: "asc" } },
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  return projects.map(({ members, ...project }) => ({
    ...project,
    projectRole: members[0] ? members[0].role : null,
  }));
};

const getProject = async (projectId, workspaceId) => prisma.project.findFirst({
  where: { id: projectId, workspaceId },
  select: safeProjectSelect,
});

const updateProject = async ({ projectId, workspaceId, name, description, status, startDate, deadline }) => {
  const current = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { startDate: true, deadline: true },
  });

  if (!current) throw new Error("PROJECT_NOT_FOUND");

  const nextStartDate = startDate === undefined ? current.startDate : startDate;
  const nextDeadline = deadline === undefined ? current.deadline : deadline;
  if (nextStartDate && nextDeadline && nextDeadline < nextStartDate) {
    throw new Error("INVALID_DATE_RANGE");
  }

  const data = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (status !== undefined) data.status = status;
  if (startDate !== undefined) data.startDate = startDate;
  if (deadline !== undefined) data.deadline = deadline;

  return prisma.project.update({
    where: { id: projectId },
    data,
    select: safeProjectSelect,
  });
};

const replaceProjectTechnologies = async ({ projectId, workspaceId, technologies }) => {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true },
    });
    if (!project) throw new Error("PROJECT_NOT_FOUND");

    await tx.projectTechnology.deleteMany({ where: { projectId } });
    if (technologies.length) {
      await tx.projectTechnology.createMany({
        data: technologies.map((technology) => ({
          projectId,
          name: technology.name,
          category: technology.category,
        })),
      });
    }

    return tx.projectTechnology.findMany({
      where: { projectId },
      orderBy: { name: "asc" },
      select: safeTechnologySelect,
    });
  });
};

const addProjectMember = async ({ projectId, workspaceId, userId, role }) => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { id: true },
  });
  if (!project) throw new Error("PROJECT_NOT_FOUND");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) throw new Error("USER_NOT_FOUND");

  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { id: true },
  });
  if (!workspaceMember) throw new Error("USER_NOT_WORKSPACE_MEMBER");

  try {
    const member = await prisma.projectMember.create({
      data: { projectId, userId, role },
      select: safeProjectMemberSelect,
    });
    return formatProjectMember(member);
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error("PROJECT_MEMBER_ALREADY_EXISTS");
    throw error;
  }
};

const listProjectMembers = async (projectId, workspaceId) => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { id: true },
  });
  if (!project) throw new Error("PROJECT_NOT_FOUND");

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    orderBy: { joinedAt: "asc" },
    select: safeProjectMemberSelect,
  });
  return members.map(formatProjectMember);
};

const removeProjectMember = async ({ projectId, workspaceId, memberId }) => {
  const member = await prisma.projectMember.findFirst({
    where: { id: memberId, projectId: projectId, project: { workspaceId } },
    select: safeProjectMemberSelect,
  });
  if (!member) throw new Error("PROJECT_MEMBER_NOT_FOUND");

  await prisma.projectMember.delete({ where: { id: memberId } });
  return formatProjectMember(member);
};

const deleteProject = async ({ projectId, workspaceId }) => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { id: true },
  });
  if (!project) throw new Error("PROJECT_NOT_FOUND");

  await prisma.project.delete({ where: { id: projectId } });
};

module.exports = {
  createProject,
  listWorkspaceProjects,
  getProject,
  updateProject,
  replaceProjectTechnologies,
  addProjectMember,
  listProjectMembers,
  removeProjectMember,
  deleteProject,
};
