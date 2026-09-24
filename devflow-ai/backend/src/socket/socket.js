const { Server } = require("socket.io");
const prisma = require("../config/prisma");
const { verifyAccessToken } = require("../utils/token");

let io;

const safeSocketUserSelect = {
  id: true,
  email: true,
  isActive: true,
};

const getToken = (value) => {
  if (typeof value !== "string") return null;
  const parts = value.trim().split(/\s+/);
  if (parts.length === 2 && parts[0] === "Bearer") return parts[1];
  return value.trim() || null;
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = getToken(socket.handshake.auth?.token);
    if (!token) return next(new Error("Authentication required"));

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: safeSocketUserSelect,
    });

    if (!user || !user.isActive) return next(new Error("Authentication required"));
    socket.user = { id: user.id, email: user.email };
    return next();
  } catch (error) {
    return next(new Error("Authentication required"));
  }
};

const projectRoom = (projectId) => `project:${projectId}`;
const isUuid = (value) => typeof value === "string"
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const socketError = (code, message) => ({ success: false, error: { code, message } });
const socketSuccess = (data = {}) => ({ success: true, ...data });

const hasProjectAccess = async (userId, workspaceId, projectId) => {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  if (!membership) return false;

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { id: true },
  });
  if (!project) return false;

  if (["ADMIN", "PROJECT_MANAGER"].includes(membership.role)) return true;
  const projectMember = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { id: true },
  });
  return Boolean(projectMember);
};

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: { origin: true, credentials: true },
  });

  io.use(authenticateSocket);
  io.on("connection", (socket) => {
    socket.on("project:join", async (payload, acknowledge) => {
      const respond = typeof acknowledge === "function" ? acknowledge : () => {};
      if (!payload || !isUuid(payload.workspaceId) || !isUuid(payload.projectId)) {
        return respond(socketError("INVALID_PROJECT", "workspaceId and projectId are required"));
      }

      try {
        const allowed = await hasProjectAccess(socket.user.id, payload.workspaceId, payload.projectId);
        if (!allowed) return respond(socketError("PROJECT_ACCESS_DENIED", "Project access denied"));
        socket.join(projectRoom(payload.projectId));
        return respond(socketSuccess({ projectId: payload.projectId }));
      } catch (error) {
        return respond(socketError("PROJECT_ACCESS_ERROR", "Unable to authorize project access"));
      }
    });

    socket.on("project:leave", (payload, acknowledge) => {
      const respond = typeof acknowledge === "function" ? acknowledge : () => {};
      if (!payload || !isUuid(payload.projectId)) {
        return respond(socketError("INVALID_PROJECT", "projectId is required"));
      }
      socket.leave(projectRoom(payload.projectId));
      return respond(socketSuccess({ projectId: payload.projectId }));
    });
  });

  return io;
};

const emitToProject = (projectId, eventName, payload) => {
  if (!io || !projectId) return;
  try {
    io.to(projectRoom(projectId)).emit(eventName, payload);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("[Socket] Project event emission failed", error.message);
  }
};

module.exports = {
  initializeSocket,
  emitToProject,
  projectRoom,
};
