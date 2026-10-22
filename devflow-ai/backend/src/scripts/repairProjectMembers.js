const prisma = require("../config/prisma");

const repairProjectMembers = async (customPrisma = prisma) => {
  const projects = await customPrisma.project.findMany({
    select: {
      id: true,
      workspaceId: true,
      createdById: true,
      createdAt: true,
      members: {
        select: { userId: true },
      },
    },
  });

  let repairedCount = 0;

  for (const project of projects) {
    const hasCreatorMembership = project.members.some(
      (member) => member.userId === project.createdById
    );
    if (hasCreatorMembership) continue;

    const isWorkspaceMember = await customPrisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: project.workspaceId,
          userId: project.createdById,
        },
      },
      select: { id: true },
    });
    if (!isWorkspaceMember) continue;

    await customPrisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: project.createdById,
        },
      },
      update: {},
      create: {
        projectId: project.id,
        userId: project.createdById,
        role: "PROJECT_MANAGER",
        joinedAt: project.createdAt,
      },
    });

    repairedCount += 1;
  }

  return { repairedCount };
};

if (require.main === module) {
  repairProjectMembers()
    .then((result) => {
      process.stdout.write(`Repaired ${result.repairedCount} project creator membership(s).\n`);
      process.exit(0);
    })
    .catch((error) => {
      process.stderr.write(`Repair failed: ${error.message}\n`);
      process.exit(1);
    });
}

module.exports = { repairProjectMembers };
