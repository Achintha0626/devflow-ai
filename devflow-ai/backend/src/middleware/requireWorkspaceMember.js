const prisma = require("../config/prisma");

const requireWorkspaceMember = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    let membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: req.params.workspaceId,
          userId: req.user.id,
        },
      },
      select: {
        id: true,
        workspaceId: true,
        userId: true,
        role: true,
        joinedAt: true,
      },
    });

    if (!membership) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: req.params.workspaceId },
        select: { id: true, createdById: true },
      });

      if (!workspace) {
        return res.status(404).json({ success: false, message: "Workspace not found" });
      }

      if (workspace.createdById === req.user.id) {
        membership = await prisma.workspaceMember.upsert({
          where: {
            workspaceId_userId: {
              workspaceId: req.params.workspaceId,
              userId: req.user.id,
            },
          },
          update: { role: "ADMIN" },
          create: {
            workspaceId: req.params.workspaceId,
            userId: req.user.id,
            role: "ADMIN",
          },
          select: {
            id: true,
            workspaceId: true,
            userId: true,
            role: true,
            joinedAt: true,
          },
        });
      } else {
        return res.status(404).json({ success: false, message: "Workspace not found" });
      }
    } else if (membership.role !== "ADMIN") {
      const workspace = await prisma.workspace.findUnique({
        where: { id: req.params.workspaceId },
        select: { createdById: true },
      });

      if (workspace?.createdById === req.user.id) {
        membership = await prisma.workspaceMember.update({
          where: { id: membership.id },
          data: { role: "ADMIN" },
          select: {
            id: true,
            workspaceId: true,
            userId: true,
            role: true,
            joinedAt: true,
          },
        });
      }
    }

    req.workspaceMember = membership;
    return next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = requireWorkspaceMember;