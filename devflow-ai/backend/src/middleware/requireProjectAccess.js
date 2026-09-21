const prisma = require("../config/prisma");

const requireProjectAccess = async (req, res, next) => {
  if (!req.user || !req.workspaceMember) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    const project = await prisma.project.findFirst({
      where: {
        id: req.params.projectId,
        workspaceId: req.params.workspaceId,
      },
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
        technologies: {
          select: { id: true, name: true, category: true },
          orderBy: { name: "asc" },
        },
        members: {
          where: { userId: req.user.id },
          select: { id: true, userId: true, role: true, joinedAt: true },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const projectMember = project.members[0] || null;
    const hasWorkspaceAccess = ["ADMIN", "PROJECT_MANAGER"].includes(req.workspaceMember.role);
    if (!hasWorkspaceAccess && !projectMember) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const { members, ...safeProject } = project;
    req.project = safeProject;
    req.projectMember = projectMember;
    return next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = requireProjectAccess;
