const prisma = require("../../config/prisma");
const { recordTaskActivity } = require("../task-activities/task-activity.service");
const { createNotification } = require("../notifications/notification.service");
const { enqueueTaskRiskEvaluation } = require("../../queues/task-risk.queue");

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
  taskNumber: true,
  title: true,
  description: true,
  type: true,
  priority: true,
  status: true,
  startedAt: true,
  completedAt: true,
  storyPoints: true,
  assigneeId: true,
  dueDate: true,
  assignee: { select: safeUserSelect },
  requirement: { select: { id: true, title: true, status: true } },
};

const safeSprintSelect = {
  id: true,
  projectId: true,
  name: true,
  goal: true,
  status: true,
  startDate: true,
  endDate: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: safeUserSelect },
};

const calculateStats = async (client, projectId, sprintId) => {
  const groups = await client.task.groupBy({
    by: ["status"],
    where: { projectId, sprintId },
    _count: { _all: true },
    _sum: { storyPoints: true },
  });
  const total = groups.reduce((sum, group) => sum + group._count._all, 0);
  const totalStoryPoints = groups.reduce((sum, group) => sum + (group._sum.storyPoints || 0), 0);
  const counts = Object.fromEntries(groups.map((group) => [group.status, group._count._all]));
  const completedStoryPoints = groups.find((group) => group.status === "DONE")?._sum.storyPoints || 0;

  return {
    totalTasks: total,
    todoTasks: counts.TODO || 0,
    inProgressTasks: counts.IN_PROGRESS || 0,
    inReviewTasks: counts.IN_REVIEW || 0,
    doneTasks: counts.DONE || 0,
    completionPercentage: total ? (counts.DONE || 0) / total * 100 : 0,
    totalStoryPoints,
    completedStoryPoints,
    storyPointCompletionPercentage: totalStoryPoints ? completedStoryPoints / totalStoryPoints * 100 : 0,
  };
};

const calculateStatsBySprint = async (client, projectId, sprintIds) => {
  const groups = await client.task.groupBy({
    by: ["sprintId", "status"],
    where: { projectId, sprintId: { in: sprintIds } },
    _count: { _all: true },
    _sum: { storyPoints: true },
  });
  const stats = Object.fromEntries(sprintIds.map((sprintId) => [sprintId, {
    totalTasks: 0,
    todoTasks: 0,
    inProgressTasks: 0,
    inReviewTasks: 0,
    doneTasks: 0,
    totalStoryPoints: 0,
    completedStoryPoints: 0,
  }]));

  groups.forEach((group) => {
    const current = stats[group.sprintId];
    const count = group._count._all;
    const points = group._sum.storyPoints || 0;
    current.totalTasks += count;
    current.totalStoryPoints += points;
    if (group.status === "TODO") current.todoTasks = count;
    if (group.status === "IN_PROGRESS") current.inProgressTasks = count;
    if (group.status === "IN_REVIEW") current.inReviewTasks = count;
    if (group.status === "DONE") {
      current.doneTasks = count;
      current.completedStoryPoints = points;
    }
  });

  return stats;
};

const createSprint = async ({ projectId, userId, name, goal, startDate, endDate }) => prisma.sprint.create({
  data: { projectId, createdById: userId, name, goal, startDate, endDate, status: "PLANNED" },
  select: safeSprintSelect,
});

const listSprints = async ({ projectId, status }) => {
  const sprints = await prisma.sprint.findMany({
    where: { projectId, ...(status ? { status } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: safeSprintSelect,
  });

  const stats = await calculateStatsBySprint(prisma, projectId, sprints.map((sprint) => sprint.id));
  return sprints.map((sprint) => {
    const sprintStats = stats[sprint.id];
    return {
      ...sprint,
      stats: {
        ...sprintStats,
        completionPercentage: sprintStats.totalTasks ? sprintStats.doneTasks / sprintStats.totalTasks * 100 : 0,
        storyPointCompletionPercentage: sprintStats.totalStoryPoints ? sprintStats.completedStoryPoints / sprintStats.totalStoryPoints * 100 : 0,
      },
    };
  });
};

const getSprint = async ({ projectId, sprintId }) => {
  const sprint = await prisma.sprint.findFirst({
    where: { id: sprintId, projectId },
    select: {
      ...safeSprintSelect,
      tasks: { orderBy: { sequenceNumber: "asc" }, select: safeTaskSelect },
    },
  });
  if (!sprint) return null;
  return { ...sprint, stats: await calculateStats(prisma, projectId, sprintId) };
};

const updateSprint = async ({ workspaceId, projectId, sprintId, name, goal, startDate, endDate }) => {
  let endDateChanged = false;
  const result = await prisma.$transaction(async (tx) => {
  const current = await tx.sprint.findFirst({
    where: { id: sprintId, projectId },
    select: { id: true, startDate: true, endDate: true },
  });
  if (!current) throw new Error("SPRINT_NOT_FOUND");

  const nextStartDate = startDate === undefined ? current.startDate : startDate;
  const nextEndDate = endDate === undefined ? current.endDate : endDate;
  if (nextStartDate && nextEndDate && nextEndDate <= nextStartDate) throw new Error("INVALID_DATE_RANGE");

  const data = {};
  if (name !== undefined) data.name = name;
  if (goal !== undefined) data.goal = goal;
  if (startDate !== undefined) data.startDate = startDate;
  if (endDate !== undefined) data.endDate = endDate;
  endDateChanged = endDate !== undefined && current.endDate?.getTime() !== endDate?.getTime();
  return tx.sprint.update({ where: { id: sprintId }, data, select: safeSprintSelect });
  });

  if (endDateChanged) {
    const activeTasks = await prisma.task.findMany({
      where: { projectId, sprintId, status: { in: ["TODO", "IN_PROGRESS", "IN_REVIEW"] } },
      select: { id: true },
    });
    await Promise.allSettled(activeTasks.map((task) => enqueueTaskRiskEvaluation({ workspaceId, projectId, taskId: task.id, reason: "SPRINT_END_DATE_CHANGED" })));
  }
  return result;
};

const transitionSprint = async ({ projectId, sprintId, transition }) => prisma.$transaction(async (tx) => {
  const sprint = await tx.sprint.findFirst({
    where: { id: sprintId, projectId },
    select: { id: true, status: true, startDate: true, endDate: true },
  });
  if (!sprint) throw new Error("SPRINT_NOT_FOUND");

  const transitions = {
    start: { from: "PLANNED", to: "ACTIVE" },
    complete: { from: "ACTIVE", to: "COMPLETED" },
    cancel: { from: ["PLANNED", "ACTIVE"], to: "CANCELLED" },
  };
  const rule = transitions[transition];
  if (!rule || (Array.isArray(rule.from) ? !rule.from.includes(sprint.status) : sprint.status !== rule.from)) {
    throw new Error("INVALID_SPRINT_TRANSITION");
  }
  const effectiveStartDate = sprint.startDate || new Date();
  if (transition === "start" && sprint.endDate && sprint.endDate <= effectiveStartDate) {
    throw new Error("INVALID_DATE_RANGE");
  }

  if (transition === "start") {
    const active = await tx.sprint.findFirst({
      where: { projectId, status: "ACTIVE", id: { not: sprintId } },
      select: { id: true },
    });
    if (active) throw new Error("ACTIVE_SPRINT_EXISTS");
  }

  return tx.sprint.update({
    where: { id: sprintId },
    data: {
      status: rule.to,
      ...(transition === "start" && !sprint.startDate ? { startDate: new Date() } : {}),
    },
    select: safeSprintSelect,
  });
}, { isolationLevel: "Serializable" }).catch((error) => {
  if (error.code === "P2034") throw new Error("ACTIVE_SPRINT_EXISTS");
  throw error;
});

const addTaskToSprint = async ({ workspaceId, projectId, sprintId, taskId, userId }) => {
  const result = await prisma.$transaction(async (tx) => {
  const sprint = await tx.sprint.findFirst({ where: { id: sprintId, projectId }, select: { id: true } });
  if (!sprint) throw new Error("SPRINT_NOT_FOUND");
  const task = await tx.task.findFirst({ where: { id: taskId, projectId }, select: { id: true, sprintId: true } });
  if (!task) throw new Error("TASK_NOT_FOUND");
  if (task.sprintId) throw new Error(task.sprintId === sprintId ? "TASK_ALREADY_IN_SPRINT" : "TASK_ALREADY_ASSIGNED");
  const updatedTask = await tx.task.update({ where: { id: taskId }, data: { sprintId }, select: safeTaskSelect });
  await recordTaskActivity({ db: tx, taskId, actorId: userId, type: "SPRINT_CHANGED", field: "sprintId", oldValue: null, newValue: sprintId });
  const notification = updatedTask.assigneeId && updatedTask.assigneeId !== userId
    ? await createNotification({
      db: tx,
      userId: updatedTask.assigneeId,
      actorId: userId,
      projectId,
      type: "TASK_MOVED",
      title: "Task moved",
      message: `${updatedTask.taskNumber} was moved to a sprint`,
      entityType: "TASK",
      entityId: taskId,
    })
    : null;
  return { task: updatedTask, notification };
  });
  await enqueueTaskRiskEvaluation({ workspaceId, projectId, taskId, reason: "SPRINT_CHANGED" });
  return result;
};

const removeTaskFromSprint = async ({ workspaceId, projectId, sprintId, taskId, userId }) => {
  const result = await prisma.$transaction(async (tx) => {
  const task = await tx.task.findFirst({ where: { id: taskId, projectId, sprintId }, select: { id: true, taskNumber: true, assigneeId: true } });
  if (!task) throw new Error("TASK_NOT_IN_SPRINT");
  await tx.task.update({ where: { id: taskId }, data: { sprintId: null } });
  await recordTaskActivity({ db: tx, taskId, actorId: userId, type: "SPRINT_CHANGED", field: "sprintId", oldValue: sprintId, newValue: null });
  const notification = task.assigneeId && task.assigneeId !== userId
    ? await createNotification({
      db: tx,
      userId: task.assigneeId,
      actorId: userId,
      projectId,
      type: "TASK_MOVED",
      title: "Task moved",
      message: `${task.taskNumber} was moved to the backlog`,
      entityType: "TASK",
      entityId: task.id,
    })
    : null;
  return { notification };
  });
  await enqueueTaskRiskEvaluation({ workspaceId, projectId, taskId, reason: "SPRINT_CHANGED" });
  return result;
};

const moveTask = async ({ workspaceId, projectId, taskId, sprintId, userId }) => {
  const result = await prisma.$transaction(async (tx) => {
  const task = await tx.task.findFirst({ where: { id: taskId, projectId }, select: { id: true, sprintId: true } });
  if (!task) throw new Error("TASK_NOT_FOUND");
  if (task.sprintId === sprintId) {
    return {
      task: await tx.task.findUnique({ where: { id: taskId }, select: safeTaskSelect }),
      oldSprintId: task.sprintId,
      newSprintId: sprintId,
      changed: false,
      notification: null,
    };
  }
  if (sprintId) {
    const sprint = await tx.sprint.findFirst({ where: { id: sprintId, projectId }, select: { id: true } });
    if (!sprint) throw new Error("SPRINT_NOT_FOUND");
  }
  const updatedTask = await tx.task.update({ where: { id: taskId }, data: { sprintId }, select: safeTaskSelect });
  await recordTaskActivity({ db: tx, taskId, actorId: userId, type: "SPRINT_CHANGED", field: "sprintId", oldValue: task.sprintId, newValue: sprintId });
  const notification = updatedTask.assigneeId && updatedTask.assigneeId !== userId
    ? await createNotification({
      db: tx,
      userId: updatedTask.assigneeId,
      actorId: userId,
      projectId,
      type: "TASK_MOVED",
      title: "Task moved",
      message: `${updatedTask.taskNumber} was moved to a sprint`,
      entityType: "TASK",
      entityId: taskId,
    })
    : null;
  return {
    task: updatedTask,
    oldSprintId: task.sprintId,
    newSprintId: sprintId,
    changed: true,
    notification,
  };
  });
  if (result.changed) await enqueueTaskRiskEvaluation({ workspaceId, projectId, taskId, reason: "SPRINT_CHANGED" });
  return result;
};

const getBacklog = async ({ projectId, filters }) => prisma.task.findMany({
  where: {
    projectId,
    sprintId: null,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
  },
  orderBy: { sequenceNumber: "asc" },
  select: safeTaskSelect,
});

const getProgress = async ({ projectId, sprintId }) => {
  const sprint = await prisma.sprint.findFirst({ where: { id: sprintId, projectId }, select: { id: true } });
  if (!sprint) throw new Error("SPRINT_NOT_FOUND");
  return calculateStats(prisma, projectId, sprintId);
};

const deleteSprint = async ({ projectId, sprintId }) => prisma.$transaction(async (tx) => {
  const sprint = await tx.sprint.findFirst({ where: { id: sprintId, projectId }, select: { id: true, status: true } });
  if (!sprint) throw new Error("SPRINT_NOT_FOUND");
  if (sprint.status === "ACTIVE") throw new Error("ACTIVE_SPRINT_CANNOT_DELETE");
  await tx.task.updateMany({ where: { projectId, sprintId }, data: { sprintId: null } });
  await tx.sprint.delete({ where: { id: sprintId } });
});

module.exports = {
  createSprint,
  listSprints,
  getSprint,
  updateSprint,
  transitionSprint,
  addTaskToSprint,
  removeTaskFromSprint,
  moveTask,
  getBacklog,
  getProgress,
  deleteSprint,
};
