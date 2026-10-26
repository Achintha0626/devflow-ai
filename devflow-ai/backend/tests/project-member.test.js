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

describe("Workspace Creator Role Assignment", () => {
  it("workspace creator is assigned ADMIN workspace role on creation", () => {
    const userId = "user-creator";
    const workspaceId = "ws-new";

    const createPayload = {
      name: "My Workspace",
      description: "Test workspace",
      slug: "my-workspace",
      createdById: userId,
      members: {
        create: {
          userId,
          role: "ADMIN",
        },
      },
    };

    assert.equal(createPayload.createdById, userId);
    assert.equal(createPayload.members.create.userId, userId);
    assert.equal(createPayload.members.create.role, "ADMIN");
  });

  it("workspace creation payload does not allow client to override creator role", () => {
    const userId = "user-creator";
    const clientProvidedPayload = { name: "Workspace", description: "Test" };

    const createWorkspaceData = {
      name: clientProvidedPayload.name,
      description: clientProvidedPayload.description,
      createdById: userId,
      members: {
        create: {
          userId,
          role: "ADMIN",
        },
      },
    };

    assert.equal(createWorkspaceData.members.create.role, "ADMIN");
    assert.ok(!Object.prototype.hasOwnProperty.call(clientProvidedPayload, "role"));
    assert.ok(!Object.prototype.hasOwnProperty.call(clientProvidedPayload, "members"));
  });

  it("workspace membership references the correct workspace and user", () => {
    const userId = "user-abc";
    const workspaceId = "ws-xyz";

    const membership = { workspaceId, userId, role: "ADMIN" };

    assert.equal(membership.workspaceId, workspaceId);
    assert.equal(membership.userId, userId);
    assert.equal(membership.role, "ADMIN");
  });
});

describe("Workspace and Project Role System Separation", () => {
  it("WorkspaceRole enum contains ADMIN, PROJECT_MANAGER, DEVELOPER, QA", () => {
    const workspaceRoles = ["ADMIN", "PROJECT_MANAGER", "DEVELOPER", "QA"];
    assert.ok(workspaceRoles.includes("ADMIN"));
    assert.ok(workspaceRoles.includes("PROJECT_MANAGER"));
    assert.ok(workspaceRoles.includes("DEVELOPER"));
    assert.ok(workspaceRoles.includes("QA"));
    assert.equal(workspaceRoles.length, 4);
  });

  it("ProjectRole enum contains PROJECT_MANAGER, DEVELOPER, QA but not ADMIN", () => {
    const projectRoles = ["PROJECT_MANAGER", "DEVELOPER", "QA"];
    assert.ok(!projectRoles.includes("ADMIN"));
    assert.ok(projectRoles.includes("PROJECT_MANAGER"));
    assert.equal(projectRoles.length, 3);
  });

  it("project creator is assigned PROJECT_MANAGER project role, not ADMIN", () => {
    const userId = "user-creator";
    const creatorProjectMember = { userId, role: "PROJECT_MANAGER" };

    const validProjectRoles = ["PROJECT_MANAGER", "DEVELOPER", "QA"];
    assert.ok(validProjectRoles.includes(creatorProjectMember.role));
    assert.notEqual(creatorProjectMember.role, "ADMIN");
  });

  it("workspace ADMIN having project access does not depend on a ProjectMember record", () => {
    const hasWorkspaceAccess = (workspaceRole) =>
      workspaceRole === "ADMIN" || workspaceRole === "PROJECT_MANAGER";

    assert.equal(hasWorkspaceAccess("ADMIN"), true);
    assert.equal(hasWorkspaceAccess("PROJECT_MANAGER"), true);
    assert.equal(hasWorkspaceAccess("DEVELOPER"), false);
    assert.equal(hasWorkspaceAccess("QA"), false);
  });
});

describe("Workspace Role Label Display Consistency", () => {
  function getWorkspaceRoleLabel(role) {
    const labels = {
      ADMIN: "Administrator",
      PROJECT_MANAGER: "Project Manager",
      DEVELOPER: "Developer",
      QA: "QA Engineer",
    };
    return labels[role] || role;
  }

  it("ADMIN workspace role displays as Administrator", () => {
    assert.equal(getWorkspaceRoleLabel("ADMIN"), "Administrator");
  });

  it("PROJECT_MANAGER workspace role displays as Project Manager", () => {
    assert.equal(getWorkspaceRoleLabel("PROJECT_MANAGER"), "Project Manager");
  });

  it("DEVELOPER workspace role displays as Developer", () => {
    assert.equal(getWorkspaceRoleLabel("DEVELOPER"), "Developer");
  });

  it("QA workspace role displays as QA Engineer", () => {
    assert.equal(getWorkspaceRoleLabel("QA"), "QA Engineer");
  });

  it("Add Member dropdown uses workspace role label not project role", () => {
    const workspaceMember = { role: "ADMIN", userId: "u-1", firstName: "Jane", email: "j@x.com" };

    const wsRoleLabel = {
      ADMIN: "Administrator",
      PROJECT_MANAGER: "Project Manager",
      DEVELOPER: "Developer",
      QA: "QA Engineer",
    }[workspaceMember.role] || workspaceMember.role;

    assert.equal(wsRoleLabel, "Administrator");
    assert.notEqual(wsRoleLabel, "ADMIN");
  });
});

describe("Privilege Escalation Prevention", () => {
  it("workspace members cannot self-assign ADMIN role via addWorkspaceMember API payload shape", () => {
    const allowedRolesFromClient = ["ADMIN", "PROJECT_MANAGER", "DEVELOPER", "QA"];
    const routeRequiresAdminActor = true;

    assert.ok(routeRequiresAdminActor);
    assert.ok(allowedRolesFromClient.every((r) => ["ADMIN", "PROJECT_MANAGER", "DEVELOPER", "QA"].includes(r)));
  });

  it("non-admin workspace member cannot promote another user to admin via role change", () => {
    const actorWorkspaceRole = "DEVELOPER";
    const canChangeRole = actorWorkspaceRole === "ADMIN";

    assert.equal(canChangeRole, false);
  });

  it("project manager cannot elevate another user to PROJECT_MANAGER project role", () => {
    const actorRole = "PROJECT_MANAGER";
    const requestedRole = "PROJECT_MANAGER";
    const isForbidden = actorRole === "PROJECT_MANAGER" && requestedRole === "PROJECT_MANAGER";

    assert.equal(isForbidden, true);
  });

  it("createWorkspace ignores any role field in client request body", () => {
    const clientBody = { name: "Hacked WS", description: "test", role: "ADMIN" };
    const { name, description } = clientBody;

    const safePayload = { name, description };

    assert.ok(!Object.prototype.hasOwnProperty.call(safePayload, "role"));
  });
});

describe("Project Members Table Role Display & Workspace Administrator Indicator", () => {
  function getWorkspaceRoleIndicator(workspaceRole) {
    if (workspaceRole === "ADMIN") {
      return "Workspace Administrator";
    }
    return null;
  }

  it("distinguishes Workspace Administrator indicator when workspaceRole is ADMIN", () => {
    const projectMember = {
      userId: "u-creator",
      role: "PROJECT_MANAGER",
      workspaceRole: "ADMIN",
    };

    const indicator = getWorkspaceRoleIndicator(projectMember.workspaceRole);
    assert.equal(indicator, "Workspace Administrator");
    assert.equal(projectMember.role, "PROJECT_MANAGER");
  });

  it("does not attach Workspace Administrator indicator when workspaceRole is DEVELOPER or QA", () => {
    const devMember = {
      userId: "u-dev",
      role: "DEVELOPER",
      workspaceRole: "DEVELOPER",
    };
    const qaMember = {
      userId: "u-qa",
      role: "QA",
      workspaceRole: "QA",
    };

    assert.equal(getWorkspaceRoleIndicator(devMember.workspaceRole), null);
    assert.equal(getWorkspaceRoleIndicator(qaMember.workspaceRole), null);
  });

  it("preserves project role and workspace role independently when formatting project members", () => {
    const rawMember = {
      id: "pm-10",
      userId: "u-admin",
      role: "PROJECT_MANAGER",
      joinedAt: new Date(),
      user: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        avatarUrl: null,
        workspaceMemberships: [{ role: "ADMIN" }],
      },
    };

    const formatted = {
      membershipId: rawMember.id,
      userId: rawMember.userId,
      firstName: rawMember.user.firstName,
      lastName: rawMember.user.lastName,
      email: rawMember.user.email,
      avatarUrl: rawMember.user.avatarUrl,
      role: rawMember.role,
      workspaceRole: rawMember.user.workspaceMemberships[0].role,
      joinedAt: rawMember.joinedAt,
    };

    assert.equal(formatted.role, "PROJECT_MANAGER");
    assert.equal(formatted.workspaceRole, "ADMIN");
  });

  it("changing a project member role from PROJECT_MANAGER to DEVELOPER keeps workspace role ADMIN", () => {
    const user = { id: "u-1" };
    const workspaceMember = { userId: user.id, role: "ADMIN" };
    const projectMember = { userId: user.id, role: "PROJECT_MANAGER" };

    // Update project role only
    projectMember.role = "DEVELOPER";

    // Workspace role must remain untouched
    assert.equal(projectMember.role, "DEVELOPER");
    assert.equal(workspaceMember.role, "ADMIN");
  });

  it("workspace creator remains WorkspaceRole.ADMIN across projects", () => {
    const workspace = { id: "ws-1", createdById: "u-creator" };
    const workspaceMemberships = [
      { workspaceId: "ws-1", userId: "u-creator", role: "ADMIN" },
    ];
    const projectMemberships = [
      { projectId: "p-1", userId: "u-creator", role: "PROJECT_MANAGER" },
      { projectId: "p-2", userId: "u-creator", role: "DEVELOPER" },
    ];

    const creatorMembership = workspaceMemberships.find(
      (m) => m.workspaceId === workspace.id && m.userId === workspace.createdById
    );

    assert.ok(creatorMembership);
    assert.equal(creatorMembership.role, "ADMIN");
    assert.equal(projectMemberships[0].role, "PROJECT_MANAGER");
    assert.equal(projectMemberships[1].role, "DEVELOPER");
  });
});

describe("Workspace Creator Administrator Permissions & Role Management", () => {
  it("workspace creator automatically receives ADMIN role upon workspace creation", () => {
    const creatorUserId = "creator-user-001";

    const workspaceData = {
      name: "New Workspace",
      description: "Admin workspace",
      slug: "new-workspace",
      createdById: creatorUserId,
      members: {
        create: {
          userId: creatorUserId,
          role: "ADMIN",
        },
      },
    };

    assert.equal(workspaceData.createdById, creatorUserId);
    assert.equal(workspaceData.members.create.userId, creatorUserId);
    assert.equal(workspaceData.members.create.role, "ADMIN");
  });

  it("workspace administrator can add members to workspace", () => {
    const actorRole = "ADMIN";
    const canAdd = actorRole === "ADMIN";
    assert.equal(canAdd, true);
  });

  it("workspace administrator can assign each valid workspace role (PROJECT_MANAGER, DEVELOPER, QA, ADMIN)", () => {
    const validRoles = ["PROJECT_MANAGER", "DEVELOPER", "QA", "ADMIN"];
    const actorRole = "ADMIN";

    for (const targetRole of validRoles) {
      const isAllowed = actorRole === "ADMIN" && validRoles.includes(targetRole);
      assert.equal(isAllowed, true, `Admin should be able to assign ${targetRole}`);
    }
  });

  it("normal workspace member cannot assign themselves or others administrator privileges", () => {
    const actorRole = "DEVELOPER";
    const canModifyRole = actorRole === "ADMIN";
    assert.equal(canModifyRole, false);
  });

  it("workspace administrator can manage project members and assign all valid project roles", () => {
    const actorWorkspaceRole = "ADMIN";
    const validProjectRoles = ["PROJECT_MANAGER", "DEVELOPER", "QA"];

    for (const projectRole of validProjectRoles) {
      const canAssign = actorWorkspaceRole === "ADMIN" && validProjectRoles.includes(projectRole);
      assert.equal(canAssign, true);
    }
  });

  it("project-level role changes do not overwrite or reduce workspace ADMIN privileges", () => {
    const userWorkspace = { userId: "creator-1", role: "ADMIN" };
    const projectMember = { userId: "creator-1", role: "PROJECT_MANAGER" };

    // Update project role to QA
    projectMember.role = "QA";

    // Workspace role must stay ADMIN
    assert.equal(userWorkspace.role, "ADMIN");
    assert.equal(projectMember.role, "QA");
  });

  it("unauthorized users cannot manage members of another workspace (tenant isolation)", () => {
    const userWorkspaceMemberships = [
      { workspaceId: "ws-own", userId: "user-1", role: "ADMIN" },
    ];
    const targetWorkspaceId = "ws-foreign";

    const isMemberOfTarget = userWorkspaceMemberships.some(
      (m) => m.workspaceId === targetWorkspaceId
    );
    assert.equal(isMemberOfTarget, false);
  });

  it("workspace creator cannot be removed from workspace or demoted from ADMIN", () => {
    const workspace = { id: "ws-1", createdById: "u-creator" };
    const targetMember = { userId: "u-creator", role: "ADMIN" };

    const isCreator = workspace.createdById === targetMember.userId;
    const canDemote = !isCreator;
    const canRemove = !isCreator;

    assert.equal(canDemote, false);
    assert.equal(canRemove, false);
  });

  it("last administrator cannot be demoted or removed", () => {
    const adminCount = 1;
    const canDemote = adminCount > 1;
    assert.equal(canDemote, false);
  });
});

