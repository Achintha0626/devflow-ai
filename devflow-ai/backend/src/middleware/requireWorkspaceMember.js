const prisma = require("../config/prisma");

const requireWorkspaceMember = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    const membership = await prisma.workspaceMember.findUnique({
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
      return res.status(404).json({ success: false, message: "Workspace not found" });
    }

    req.workspaceMember = membership;
    return next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = requireWorkspaceMember;