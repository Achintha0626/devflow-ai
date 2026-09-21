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
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
    select: {
      role: true,
      joinedAt: true,
      workspace: { select: safeWorkspaceSelect },
    },
  });

  if (!membership) return null;

  return {
    workspace: membership.workspace,
    membership: {
      role: membership.role,
      joinedAt: membership.joinedAt,
    },
  };
};

module.exports = {
  createWorkspace,
  listUserWorkspaces,
  getUserWorkspace,
};