const prisma = require("../../config/prisma");

const safeUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
};

const safeTaskSelect = {
  id: true,
  projectId: true,
  sprintId: true,
  requirementId: true,
  aiSuggestedTaskId: true,
  sequenceNumber: true,
  taskNumber: true,
  title: true,
  description: true,
  type: true,
  priority: true,
  status: true,
  storyPoints: true,
  assigneeId: true,
  createdById: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  assignee: { select: safeUserSelect },
  requirement: { select: { id: true, title: true, status: true } },
  createdBy: { select: safeUserSelect },
};

const isConflict = (error) => error && (error.code === "P2002" || error.code === "P2034");

const TASK_STATUS_TRANSITIONS = {
  TODO: ["IN_PROGRESS"],
  IN_PROGRESS: ["TODO", "IN_REVIEW"],
  IN_REVIEW: ["IN_PROGRESS", "DONE"],
  DONE: ["IN_REVIEW"],
};

const validateTaskStatusTransition = (currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) throw new Error("TASK_STATUS_UNCHANGED");
  if (!TASK_STATUS_TRANSITIONS[currentStatus]?.includes(nextStatus)) {
    throw new Error("INVALID_TASK_STATUS_TRANSITION");
  }
};

const allocateTaskNumber = async (tx, projectId, projectKey) => {
  const sequence = await tx.projectTaskSequence.upsert({
    where: { projectId },
    create: { projectId, nextNumber: 2 },
    update: { nextNumber: { increment: 1 } },
    select: { nextNumber: true },
  });
  const sequenceNumber = sequence.nextNumber - 1;
  return { sequenceNumber, taskNumber: `${projectKey}-${sequenceNumber}` };
};

const withSequenceRetry = async (operation) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isConflict(error) || attempt === 2) throw error;
    }
  }
};

const validateTaskRelations = async (tx, { projectId, requirementId, assigneeId }) => {
  if (requirementId) {
    const requirement = await tx.requirement.findFirst({
      where: { id: requirementId, projectId },
      select: { id: true },
    });
    if (!requirement) throw new Error("REQUIREMENT_NOT_FOUND");
  }

  if (assigneeId) {
    const member = await tx.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: assigneeId } },
      select: { id: true },
    });
    if (!member) throw new Error("ASSIGNEE_NOT_PROJECT_MEMBER");
  }
};

const createTask = async ({ project, userId, task }) => withSequenceRetry(() => prisma.$transaction(async (tx) => {
  await validateTaskRelations(tx, {
    projectId: project.id,
    requirementId: task.requirementId,
    assigneeId: task.assigneeId,
  });
  const number = await allocateTaskNumber(tx, project.id, project.key);
  return tx.task.create({
    data: {
      projectId: project.id,
      ...number,
      ...task,
      createdById: userId,
    },
    select: safeTaskSelect,
  });
}));

const listTasks = async ({ projectId, filters }) => prisma.task.findMany({
  where: {
    projectId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
    ...(filters.requirementId ? { requirementId: filters.requirementId } : {}),
    ...(filters.search ? {
      OR: [
        { taskNumber: { contains: filters.search, mode: "insensitive" } },
        { title: { contains: filters.search, mode: "insensitive" } },
      ],
    } : {}),
  },
  orderBy: [{ sequenceNumber: "asc" }],
  select: safeTaskSelect,
});

const getTask = async ({ projectId, taskId }) => prisma.task.findFirst({
  where: { id: taskId, projectId },
  select: safeTaskSelect,
});

const updateTask = async ({ project, taskId, task }) => prisma.$transaction(async (tx) => {
  const existing = await tx.task.findFirst({
    where: { id: taskId, projectId: project.id },
    select: { id: true },
  });
  if (!existing) throw new Error("TASK_NOT_FOUND");

  await validateTaskRelations(tx, {
    projectId: project.id,
    requirementId: task.requirementId,
    assigneeId: task.assigneeId,
  });

  return tx.task.update({
    where: { id: taskId },
    data: task,
    select: safeTaskSelect,
  });
});

const updateTaskStatus = async ({ projectId, taskId, userId, workspaceRole, projectRole, status }) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId },
    select: { id: true, assigneeId: true, status: true },
  });
  if (!task) throw new Error("TASK_NOT_FOUND");

  const isManager = ["ADMIN", "PROJECT_MANAGER"].includes(workspaceRole) || projectRole === "PROJECT_MANAGER";
  if (!isManager && task.assigneeId !== userId) throw new Error("TASK_STATUS_FORBIDDEN");
  validateTaskStatusTransition(task.status, status);

  return prisma.task.update({
    where: { id: taskId },
    data: { status },
    select: safeTaskSelect,
  });
};

const assignTask = async ({ project, taskId, assigneeId }) => prisma.$transaction(async (tx) => {
  const existing = await tx.task.findFirst({
    where: { id: taskId, projectId: project.id },
    select: { id: true },
  });
  if (!existing) throw new Error("TASK_NOT_FOUND");
  await validateTaskRelations(tx, { projectId: project.id, assigneeId });

  return tx.task.update({
    where: { id: taskId },
    data: { assigneeId },
    select: safeTaskSelect,
  });
});

const deleteTask = async ({ projectId, taskId }) => {
  const result = await prisma.task.deleteMany({ where: { id: taskId, projectId } });
  if (result.count !== 1) throw new Error("TASK_NOT_FOUND");
};

const convertSuggestionToTask = async ({ project, requirementId, suggestionId, userId, task }) => withSequenceRetry(() => prisma.$transaction(async (tx) => {
  const suggestion = await tx.aISuggestedTask.findFirst({
    where: {
      id: suggestionId,
      aiGeneration: {
        requirementId,
        requirement: { projectId: project.id },
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      priority: true,
      estimatedStoryPoints: true,
      status: true,
      task: { select: { id: true } },
    },
  });

  if (!suggestion) throw new Error("SUGGESTION_NOT_FOUND");
  if (suggestion.task) throw new Error("SUGGESTION_ALREADY_CONVERTED");
  if (!["APPROVED", "EDITED"].includes(suggestion.status)) throw new Error("SUGGESTION_NOT_CONVERTIBLE");

  await validateTaskRelations(tx, {
    projectId: project.id,
    requirementId,
    assigneeId: task.assigneeId,
  });
  const number = await allocateTaskNumber(tx, project.id, project.key);

  return tx.task.create({
    data: {
      projectId: project.id,
      requirementId,
      aiSuggestedTaskId: suggestion.id,
      ...number,
      title: suggestion.title,
      description: suggestion.description,
      type: suggestion.type,
      priority: suggestion.priority,
      storyPoints: suggestion.estimatedStoryPoints,
      status: "TODO",
      assigneeId: task.assigneeId,
      dueDate: task.dueDate,
      createdById: userId,
    },
    select: safeTaskSelect,
  });
}));

module.exports = {
  createTask,
  listTasks,
  getTask,
  updateTask,
  updateTaskStatus,
  assignTask,
  deleteTask,
  convertSuggestionToTask,
  validateTaskStatusTransition,
};
