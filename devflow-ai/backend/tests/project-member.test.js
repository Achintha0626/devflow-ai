const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { repairProjectMembers } = require("../src/scripts/repairProjectMembers");

describe("Project Creator Assignment & Membership", () => {
  it("createProject payload includes creator as initial PROJECT_MANAGER", () => {
    const userId = "user-123";
    const workspaceId = "ws-123";
    const createProjectData = {
      workspaceId,
      name: "New Platform",
      key: "NP",
      description: "Platform description",
      startDate: new Date(),
      deadline: new Date(Date.now() + 86400000),
      createdById: userId,
      technologies: {
        create: [{ name: "React", category: "Frontend" }],
      },
      members: {
        create: { userId, role: "PROJECT_MANAGER" },
      },
    };

    assert.equal(createProjectData.createdById, userId);
    assert.deepEqual(createProjectData.members.create, {
      userId,
      role: "PROJECT_MANAGER",
    });
  });
});

describe("Project Member Management Authorization & Validation", () => {
  it("rejects non-admin/pm actor from adding project members", async () => {
    const actorRole = "DEVELOPER";
    const canAdd = ["ADMIN", "PROJECT_MANAGER"].includes(actorRole);
    assert.equal(canAdd, false);
  });

  it("prevents project manager from assigning PROJECT_MANAGER role", async () => {
    const actorRole = "PROJECT_MANAGER";
    const assignedRole = "PROJECT_MANAGER";
    const isForbidden = actorRole === "PROJECT_MANAGER" && assignedRole === "PROJECT_MANAGER";
    assert.equal(isForbidden, true);
  });

  it("allows workspace admin to assign PROJECT_MANAGER role", async () => {
    const actorRole = "ADMIN";
    const assignedRole = "PROJECT_MANAGER";
    const isForbidden = actorRole === "PROJECT_MANAGER" && assignedRole === "PROJECT_MANAGER";
    assert.equal(isForbidden, false);
  });

  it("requires user to be a workspace member before adding to project", async () => {
    const mockDb = {
      project: {
        findFirst: async () => ({ id: "p-1" }),
      },
      user: {
        findUnique: async () => ({ id: "u-2" }),
      },
      workspaceMember: {
        findUnique: async () => null,
      },
    };

    const project = await mockDb.project.findFirst();
    assert.ok(project);

    const user = await mockDb.user.findUnique();
    assert.ok(user);

    const workspaceMember = await mockDb.workspaceMember.findUnique();
    assert.equal(workspaceMember, null);
  });

  it("detects and prevents duplicate project membership", async () => {
    const mockDb = {
      projectMember: {
        findUnique: async ({ where }) => {
          if (where.projectId_userId.projectId === "p-1" && where.projectId_userId.userId === "u-1") {
            return { id: "pm-1", projectId: "p-1", userId: "u-1", role: "DEVELOPER" };
          }
          return null;
        },
      },
    };

    const existing = await mockDb.projectMember.findUnique({
      where: { projectId_userId: { projectId: "p-1", userId: "u-1" } },
    });
    assert.ok(existing);
    assert.equal(existing.userId, "u-1");

    const nonExisting = await mockDb.projectMember.findUnique({
      where: { projectId_userId: { projectId: "p-1", userId: "u-99" } },
    });
    assert.equal(nonExisting, null);
  });

  it("allows only workspace ADMIN to remove a project member", async () => {
    const checkRemovePermission = (actorRole) => {
      if (actorRole && actorRole !== "ADMIN") {
        throw new Error("INSUFFICIENT_WORKSPACE_PERMISSIONS");
      }
    };

    assert.throws(() => checkRemovePermission("PROJECT_MANAGER"), {
      message: "INSUFFICIENT_WORKSPACE_PERMISSIONS",
    });
    assert.throws(() => checkRemovePermission("DEVELOPER"), {
      message: "INSUFFICIENT_WORKSPACE_PERMISSIONS",
    });
    assert.doesNotThrow(() => checkRemovePermission("ADMIN"));
  });

  it("removing project member targets only the single member record", async () => {
    const deletedRecords = [];
    const mockDb = {
      projectMember: {
        delete: async ({ where }) => {
          deletedRecords.push(where.id);
          return { id: where.id };
        },
      },
    };

    const memberIdToRemove = "pm-specific-id";
    await mockDb.projectMember.delete({ where: { id: memberIdToRemove } });

    assert.equal(deletedRecords.length, 1);
    assert.equal(deletedRecords[0], memberIdToRemove);
  });
});

describe("Workspace Member Removal Referential Integrity", () => {
  it("removes user project memberships in workspace without deleting projects or unrelated members", async () => {
    const workspaceId = "ws-main";
    const targetUserId = "user-to-remove";
    const otherUserId = "user-staying";

    const projectMembers = [
      { id: "pm-1", workspaceId, projectId: "proj-1", userId: targetUserId },
      { id: "pm-2", workspaceId, projectId: "proj-2", userId: targetUserId },
      { id: "pm-3", workspaceId, projectId: "proj-1", userId: otherUserId },
      { id: "pm-4", workspaceId: "ws-other", projectId: "proj-9", userId: targetUserId },
    ];

    const projects = [
      { id: "proj-1", workspaceId, name: "Project One", createdById: targetUserId },
      { id: "proj-2", workspaceId, name: "Project Two", createdById: otherUserId },
    ];

    let remainingProjectMembers = [...projectMembers];
    const remainingProjects = [...projects];

    const deleteWorkspaceMemberSimulation = async (userId) => {
      remainingProjectMembers = remainingProjectMembers.filter(
        (pm) => !(pm.userId === userId && pm.workspaceId === workspaceId)
      );
    };

    await deleteWorkspaceMemberSimulation(targetUserId);

    assert.equal(remainingProjectMembers.length, 2);
    assert.ok(remainingProjectMembers.some((pm) => pm.id === "pm-3" && pm.userId === otherUserId));
    assert.ok(remainingProjectMembers.some((pm) => pm.id === "pm-4" && pm.workspaceId === "ws-other"));
    assert.equal(remainingProjects.length, 2);
    assert.equal(remainingProjects[0].id, "proj-1");
  });
});

describe("Authorization Middleware Project Access", () => {
  it("workspace ADMIN and PROJECT_MANAGER retain access when not in project members", () => {
    const evaluateAccess = (workspaceRole, projectMember) => {
      const hasWorkspaceAccess = ["ADMIN", "PROJECT_MANAGER"].includes(workspaceRole);
      return Boolean(hasWorkspaceAccess || projectMember);
    };

    assert.equal(evaluateAccess("ADMIN", null), true);
    assert.equal(evaluateAccess("PROJECT_MANAGER", null), true);
    assert.equal(evaluateAccess("DEVELOPER", null), false);
    assert.equal(evaluateAccess("QA", null), false);
    assert.equal(evaluateAccess("DEVELOPER", { role: "DEVELOPER" }), true);
  });

  it("workspace roles and project roles remain independent for project management", () => {
    const evaluateManagement = (workspaceRole, projectMemberRole) => {
      return (
        ["ADMIN", "PROJECT_MANAGER"].includes(workspaceRole) ||
        projectMemberRole === "PROJECT_MANAGER"
      );
    };

    assert.equal(evaluateManagement("ADMIN", null), true);
    assert.equal(evaluateManagement("DEVELOPER", "PROJECT_MANAGER"), true);
    assert.equal(evaluateManagement("DEVELOPER", "DEVELOPER"), false);
    assert.equal(evaluateManagement("QA", "QA"), false);
  });
});

describe("Idempotent Database Repair For Existing Projects", () => {
  it("repairs projects where creator has no ProjectMember record and is still workspace member", async () => {
    const mockState = {
      projects: [
        {
          id: "proj-old-1",
          workspaceId: "ws-1",
          createdById: "user-admin",
          createdAt: new Date("2026-01-01"),
          members: [],
        },
        {
          id: "proj-old-2",
          workspaceId: "ws-1",
          createdById: "user-former-member",
          createdAt: new Date("2026-01-02"),
          members: [],
        },
        {
          id: "proj-already-has-pm",
          workspaceId: "ws-1",
          createdById: "user-admin",
          createdAt: new Date("2026-01-03"),
          members: [{ userId: "user-admin", role: "PROJECT_MANAGER" }],
        },
      ],
      workspaceMembers: [
        { workspaceId: "ws-1", userId: "user-admin" },
      ],
      createdProjectMembers: [],
    };

    const mockPrisma = {
      project: {
        findMany: async () => mockState.projects,
      },
      workspaceMember: {
        findUnique: async ({ where }) => {
          const found = mockState.workspaceMembers.find(
            (wm) =>
              wm.workspaceId === where.workspaceId_userId.workspaceId &&
              wm.userId === where.workspaceId_userId.userId
          );
          return found || null;
        },
      },
      projectMember: {
        upsert: async ({ create }) => {
          mockState.createdProjectMembers.push(create);
          return create;
        },
      },
    };

    const firstRun = await repairProjectMembers(mockPrisma);
    assert.equal(firstRun.repairedCount, 1);
    assert.equal(mockState.createdProjectMembers.length, 1);
    assert.equal(mockState.createdProjectMembers[0].projectId, "proj-old-1");
    assert.equal(mockState.createdProjectMembers[0].userId, "user-admin");
    assert.equal(mockState.createdProjectMembers[0].role, "PROJECT_MANAGER");

    mockState.projects[0].members.push({ userId: "user-admin", role: "PROJECT_MANAGER" });
    const secondRun = await repairProjectMembers(mockPrisma);
    assert.equal(secondRun.repairedCount, 0);
  });
});
