const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const requireWorkspaceMember = require("../src/middleware/requireWorkspaceMember");
const requireProjectAccess = require("../src/middleware/requireProjectAccess");
const requireProjectManagement = require("../src/middleware/requireProjectManagement");
const requireWorkspaceRole = require("../src/middleware/requireWorkspaceRole");
const authenticate = require("../src/middleware/authenticate");

describe("Tenant Isolation and Permissions", () => {
  const createMockContext = ({ user, workspaceMember, project, projectMember, params, headers } = {}) => {
    const req = {
      user: user || null,
      workspaceMember: workspaceMember || null,
      project: project || null,
      projectMember: projectMember || null,
      params: params || {},
      headers: headers || {},
    };

    let statusCode = 200;
    let jsonBody = null;

    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (body) => {
        jsonBody = body;
        return res;
      },
      _getStatusCode: () => statusCode,
      _getJsonBody: () => jsonBody,
    };

    return { req, res };
  };

  test("rejects unauthenticated requests with 401", async () => {
    const { req, res } = createMockContext({
      headers: {},
    });

    let nextCalled = false;
    await authenticate(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res._getStatusCode(), 401);
    assert.deepEqual(res._getJsonBody(), {
      success: false,
      message: "Authentication required",
    });
  });

  test("rejects request if user is not a member of target workspace with 404", async () => {
    const { req, res } = createMockContext({
      user: { id: "user-100" },
      params: { workspaceId: "foreign-workspace-999" },
    });

    let nextCalled = false;
    await requireWorkspaceMember(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res._getStatusCode(), 404);
    assert.deepEqual(res._getJsonBody(), {
      success: false,
      message: "Workspace not found",
    });
  });

  test("denies project access to workspace member if not on project and not admin/pm", async () => {
    const { req, res } = createMockContext({
      user: { id: "user-dev" },
      workspaceMember: { role: "MEMBER" },
      params: { workspaceId: "ws-1", projectId: "proj-1" },
    });

    let nextCalled = false;
    await requireProjectAccess(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res._getStatusCode(), 404);
    assert.deepEqual(res._getJsonBody(), {
      success: false,
      message: "Project not found",
    });
  });

  test("denies project management actions to standard project developers with 403", () => {
    const { req, res } = createMockContext({
      user: { id: "user-dev" },
      workspaceMember: { role: "MEMBER" },
      project: { id: "proj-1", workspaceId: "ws-1" },
      projectMember: { id: "pmem-1", role: "DEVELOPER" },
    });

    let nextCalled = false;
    requireProjectManagement(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res._getStatusCode(), 403);
    assert.deepEqual(res._getJsonBody(), {
      success: false,
      message: "Project management permissions required",
    });
  });

  test("denies project management actions to QA roles with 403", () => {
    const { req, res } = createMockContext({
      user: { id: "user-qa" },
      workspaceMember: { role: "MEMBER" },
      project: { id: "proj-1", workspaceId: "ws-1" },
      projectMember: { id: "pmem-2", role: "QA" },
    });

    let nextCalled = false;
    requireProjectManagement(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res._getStatusCode(), 403);
    assert.deepEqual(res._getJsonBody(), {
      success: false,
      message: "Project management permissions required",
    });
  });

  test("allows project manager on project to perform project management", () => {
    const { req, res } = createMockContext({
      user: { id: "user-pm" },
      workspaceMember: { role: "MEMBER" },
      project: { id: "proj-1", workspaceId: "ws-1" },
      projectMember: { id: "pmem-3", role: "PROJECT_MANAGER" },
    });

    let nextCalled = false;
    requireProjectManagement(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(res._getStatusCode(), 200);
  });

  test("allows workspace ADMIN to perform project management even if not direct project member", () => {
    const { req, res } = createMockContext({
      user: { id: "user-admin" },
      workspaceMember: { role: "ADMIN" },
      project: { id: "proj-1", workspaceId: "ws-1" },
      projectMember: null,
    });

    let nextCalled = false;
    requireProjectManagement(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(res._getStatusCode(), 200);
  });

  test("allows workspace PROJECT_MANAGER to perform project management", () => {
    const { req, res } = createMockContext({
      user: { id: "user-wpm" },
      workspaceMember: { role: "PROJECT_MANAGER" },
      project: { id: "proj-1", workspaceId: "ws-1" },
      projectMember: null,
    });

    let nextCalled = false;
    requireProjectManagement(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(res._getStatusCode(), 200);
  });

  test("enforces workspace role requirements and rejects non-admin with 403", () => {
    const checkAdmin = requireWorkspaceRole("ADMIN");

    const { req: memberReq, res: memberRes } = createMockContext({
      user: { id: "user-1" },
      workspaceMember: { role: "MEMBER" },
    });

    let called = false;
    checkAdmin(memberReq, memberRes, () => {
      called = true;
    });

    assert.equal(called, false);
    assert.equal(memberRes._getStatusCode(), 403);
    assert.deepEqual(memberRes._getJsonBody(), {
      success: false,
      message: "Insufficient workspace permissions",
    });

    const { req: adminReq, res: adminRes } = createMockContext({
      user: { id: "user-admin" },
      workspaceMember: { role: "ADMIN" },
    });

    let adminCalled = false;
    checkAdmin(adminReq, adminRes, () => {
      adminCalled = true;
    });

    assert.equal(adminCalled, true);
    assert.equal(adminRes._getStatusCode(), 200);
  });
});
