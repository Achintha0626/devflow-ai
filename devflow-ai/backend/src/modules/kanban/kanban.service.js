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
  taskNumber: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  type: true,
  storyPoints: true,
  startedAt: true,
  completedAt: true,
  dueDate: true,
  sprintId: true,
  requirementId: true,
  sequenceNumber: true,
  assignee: { select: safeUserSelect },
};

const getSummary = (tasks) => {
  const counts = tasks.reduce((result, task) => {
    result[task.status] += 1;
    return result;
  }, { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 });
  const totalStoryPoints = tasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0);
  const completedStoryPoints = tasks
    .filter((task) => task.status === "DONE")
    .reduce((sum, task) => sum + (task.storyPoints || 0), 0);

  return {
    totalTasks: tasks.length,
    todoTasks: counts.TODO,
    inProgressTasks: counts.IN_PROGRESS,
    inReviewTasks: counts.IN_REVIEW,
    doneTasks: counts.DONE,
    completionPercentage: tasks.length ? (counts.DONE / tasks.length) * 100 : 0,
    totalStoryPoints,
    completedStoryPoints,
    storyPointCompletionPercentage: totalStoryPoints ? (completedStoryPoints / totalStoryPoints) * 100 : 0,
  };
};

const groupTasks = (tasks) => ({
  todo: tasks.filter((task) => task.status === "TODO"),
  inProgress: tasks.filter((task) => task.status === "IN_PROGRESS"),
  inReview: tasks.filter((task) => task.status === "IN_REVIEW"),
  done: tasks.filter((task) => task.status === "DONE"),
});

const getBoard = async ({ projectId, filters, sprintId }) => {
  let resolvedSprintId = sprintId;
  let sprint = null;

  if (sprintId === "backlog") {
    resolvedSprintId = null;
  } else if (sprintId) {
    sprint = await prisma.sprint.findFirst({
      where: { id: sprintId, projectId },
      select: { id: true, name: true, goal: true, status: true, startDate: true, endDate: true },
    });
    if (!sprint) throw new Error("SPRINT_NOT_FOUND");
  }

  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      ...(sprintId !== undefined ? { sprintId: resolvedSprintId } : {}),
      ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.type ? { type: filters.type } : {}),
    },
    orderBy: { sequenceNumber: "asc" },
    select: safeTaskSelect,
  });

  return {
    ...(sprint ? { sprint } : {}),
    columns: groupTasks(tasks),
    summary: getSummary(tasks),
  };
};

module.exports = {
  getBoard,
};
