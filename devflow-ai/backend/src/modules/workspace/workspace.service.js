const prisma = require("../../config/prisma");

const safeWorkspaceSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
};

const safeMemberSelect = {
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

const slugify = (value) => {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "workspace";
};

const isUniqueConstraintError = (error) => error && error.code === "P2002";

const createWorkspace = async ({ name, description, userId }) => {
  const baseSlug = slugify(name);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        let slug = baseSlug;
        let suffix = 2;

        while (await tx.workspace.findUnique({ where: { slug } })) {
          slug = `${baseSlug}-${suffix}`;
          suffix += 1;
        }

        const workspace = await tx.workspace.create({
          data: {
            name,
            description,
            slug,
            createdById: userId,
            members: {
              create: {
                userId,
                role: "ADMIN",
              },
            },
          },
          select: {
            ...safeWorkspaceSelect,
            members: {
              where: { userId },
              select: { role: true, joinedAt: true },
            },
          },
        });

        return {
          workspace: {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            description: workspace.description,
            createdById: workspace.createdById,
            createdAt: workspace.createdAt,
            updatedAt: workspace.updatedAt,
          },
          membership: workspace.members[0],
        };
      });
    } catch (error) {
      if (!isUniqueConstraintError(error) || attempt === 4) throw error;
    }
  }
};

const listUserWorkspaces = async (userId) => {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    orderBy: { joinedAt: "desc" },
    select: {
      role: true,
      joinedAt: true,
      workspace: { select: safeWorkspaceSelect },
    },
  });

  return memberships.map(({ workspace, role, joinedAt }) => ({
    ...workspace,
    role,
    joinedAt,
  }));
};

const getUserWorkspace = async ({ workspaceId, userId }) => {
  let membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
    select: {
      id: true,
      role: true,
      joinedAt: true,
      workspace: { select: safeWorkspaceSelect },
    },
  });

  if (!membership) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: safeWorkspaceSelect,
    });
    if (!workspace || workspace.createdById !== userId) return null;

    membership = await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
      update: { role: "ADMIN" },
      create: {
        workspaceId,
        userId,
        role: "ADMIN",
      },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        workspace: { select: safeWorkspaceSelect },
      },
    });
  } else if (membership.workspace?.createdById === userId && membership.role !== "ADMIN") {
    membership = await prisma.workspaceMember.update({
      where: { id: membership.id },
      data: { role: "ADMIN" },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        workspace: { select: safeWorkspaceSelect },
      },
    });
  }

  return {
    workspace: membership.workspace,
    membership: {
      role: membership.role,
      joinedAt: membership.joinedAt,
    },
  };
};

const formatMember = (member) => ({
  membershipId: member.id,
  userId: member.userId,
  firstName: member.user.firstName,
  lastName: member.user.lastName,
  email: member.user.email,
  avatarUrl: member.user.avatarUrl,
  role: member.role,
  joinedAt: member.joinedAt,
});

const addWorkspaceMember = async ({ workspaceId, email, role }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) throw new Error("USER_NOT_FOUND");

  const existingMembership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
  });

  if (existingMembership) throw new Error("MEMBER_ALREADY_EXISTS");

  try {
    const member = await prisma.workspaceMember.create({
      data: { workspaceId, userId: user.id, role },
      select: safeMemberSelect,
    });

    return formatMember(member);
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error("MEMBER_ALREADY_EXISTS");
    throw error;
  }
};

const listWorkspaceMembers = async (workspaceId) => {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    orderBy: { joinedAt: "asc" },
    select: safeMemberSelect,
  });

  return members.map(formatMember);
};

const changeWorkspaceMemberRole = async ({ workspaceId, memberId, role }) => {
  try {
    const member = await prisma.$transaction(async (tx) => {
      const currentMember = await tx.workspaceMember.findFirst({
        where: { id: memberId, workspaceId },
        select: { id: true, userId: true, role: true },
      });

      if (!currentMember) throw new Error("MEMBER_NOT_FOUND");

      if (currentMember.role === role) {
        return tx.workspaceMember.findFirst({
          where: { id: memberId, workspaceId },
          select: safeMemberSelect,
        });
      }

      const workspace = await tx.workspace.findUnique({
        where: { id: workspaceId },
        select: { createdById: true },
      });

      if (workspace && workspace.createdById === currentMember.userId && role !== "ADMIN") {
        throw new Error("CANNOT_DEMOTE_WORKSPACE_CREATOR");
      }

      if (currentMember.role === "ADMIN" && role !== "ADMIN") {
        const adminCount = await tx.workspaceMember.count({
          where: { workspaceId, role: "ADMIN" },
        });

        if (adminCount <= 1) throw new Error("LAST_ADMIN");
      }

      return tx.workspaceMember.update({
        where: { id: memberId },
        data: { role },
        select: safeMemberSelect,
      });
    }, { isolationLevel: "Serializable" });

    return formatMember(member);
  } catch (error) {
    if (error.code === "P2034") throw new Error("TRANSACTION_CONFLICT");
    throw error;
  }
};

const removeWorkspaceMember = async ({ workspaceId, memberId }) => {
  try {
    const member = await prisma.$transaction(async (tx) => {
      const currentMember = await tx.workspaceMember.findFirst({
        where: { id: memberId, workspaceId },
        select: { id: true, userId: true, role: true },
      });

      if (!currentMember) throw new Error("MEMBER_NOT_FOUND");

      const workspace = await tx.workspace.findUnique({
        where: { id: workspaceId },
        select: { createdById: true },
      });

      if (workspace && workspace.createdById === currentMember.userId) {
        throw new Error("CANNOT_REMOVE_WORKSPACE_CREATOR");
      }

      if (currentMember.role === "ADMIN") {
        const adminCount = await tx.workspaceMember.count({
          where: { workspaceId, role: "ADMIN" },
        });

        if (adminCount <= 1) throw new Error("LAST_ADMIN");
      }

      await tx.projectMember.deleteMany({
        where: {
          userId: currentMember.userId,
          project: { workspaceId },
        },
      });

      return tx.workspaceMember.delete({
        where: { id: memberId },
        select: safeMemberSelect,
      });
    }, { isolationLevel: "Serializable" });

    return formatMember(member);
  } catch (error) {
    if (error.code === "P2034") throw new Error("TRANSACTION_CONFLICT");
    throw error;
  }
};

module.exports = {
  createWorkspace,
  listUserWorkspaces,
  getUserWorkspace,
  addWorkspaceMember,
  listWorkspaceMembers,
  changeWorkspaceMemberRole,
  removeWorkspaceMember,
};