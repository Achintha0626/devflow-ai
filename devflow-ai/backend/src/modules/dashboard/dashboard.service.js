const prisma = require("../../config/prisma");

const TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const TASK_TYPES = ["FRONTEND", "BACKEND", "DATABASE", "DEVOPS", "TESTING", "DESIGN", "DOCUMENTATION", "BUG", "OTHER"];
const REQUIREMENT_STATUSES = ["DRAFT", "READY", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

const safeUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
};

const withZeroCounts = (values, groups, key) => {
  const counts = Object.fromEntries(values.map((value) => [value, 0]));
  groups.forEach((group) => {
    counts[group[key]] = group._count._all;
  });
  return counts;
};

const getTaskSummary = async (projectId) => {
  const [totalTasks, completedTasks] = await Promise.all([
    prisma.task.count({ where: { projectId } }),
    prisma.task.count({ where: { projectId, status: "DONE" } }),
  ]);

  return {
    totalTasks,
    completedTasks,
    completionPercentage: totalTasks ? (completedTasks / totalTasks) * 100 : 0,
  };
};

const getMemberWorkload = async (projectId) => {
  const [members, groups] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId },
      orderBy: { joinedAt: "asc" },
      select: { userId: true, role: true, user: { select: safeUserSelect } },
    }),
    prisma.task.groupBy({
      by: ["assigneeId", "status"],
      where: { projectId, assigneeId: { not: null } },
      _count: { _all: true },
      _sum: { storyPoints: true },
    }),
  ]);

  const grouped = {};
  groups.forEach((group) => {
    if (!grouped[group.assigneeId]) grouped[group.assigneeId] = {};
    grouped[group.assigneeId][group.status] = {
      count: group._count._all,
      storyPoints: group._sum.storyPoints || 0,
    };
  });

  return members.map((member) => {
    const workload = grouped[member.userId] || {};
    const count = (status) => workload[status]?.count || 0;
    const storyPoints = Object.values(workload).reduce((sum, value) => sum + value.storyPoints, 0);
    return {
      user: member.user,
      role: member.role,
      totalAssignedTasks: Object.values(workload).reduce((sum, value) => sum + value.count, 0),
      todoTasks: count("TODO"),
      inProgressTasks: count("IN_PROGRESS"),
      inReviewTasks: count("IN_REVIEW"),
      doneTasks: count("DONE"),
      totalStoryPoints: storyPoints,
    };
  });
};

const getActiveSprint = async (projectId) => {
  const sprint = await prisma.sprint.findFirst({
    where: { projectId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      goal: true,
      status: true,
      startDate: true,
      endDate: true,
    },
  });
  if (!sprint) return null;

  const groups = await prisma.task.groupBy({
    by: ["status"],
    where: { projectId, sprintId: sprint.id },
    _count: { _all: true },
    _sum: { storyPoints: true },
  });
  const counts = Object.fromEntries(groups.map((group) => [group.status, group._count._all]));
  const totalTasks = groups.reduce((sum, group) => sum + group._count._all, 0);
  const totalStoryPoints = groups.reduce((sum, group) => sum + (group._sum.storyPoints || 0), 0);
  const completedStoryPoints = groups.find((group) => group.status === "DONE")?._sum.storyPoints || 0;
  const completedTasks = counts.DONE || 0;

  return {
    ...sprint,
    totalTasks,
    completedTasks,
    completionPercentage: totalTasks ? (completedTasks / totalTasks) * 100 : 0,
    totalStoryPoints,
    completedStoryPoints,
  };
};

const getDashboard = async (projectId) => {
  const [taskSummary, totalRequirements, totalMembers, statusGroups, priorityGroups, typeGroups, requirementGroups, activeSprint, memberWorkload, recentActivity] = await Promise.all([
    getTaskSummary(projectId),
    prisma.requirement.count({ where: { projectId } }),
    prisma.projectMember.count({ where: { projectId } }),
    prisma.task.groupBy({ by: ["status"], where: { projectId }, _count: { _all: true } }),
    prisma.task.groupBy({ by: ["priority"], where: { projectId }, _count: { _all: true } }),
    prisma.task.groupBy({ by: ["type"], where: { projectId }, _count: { _all: true } }),
    prisma.requirement.groupBy({ by: ["status"], where: { projectId }, _count: { _all: true } }),
    getActiveSprint(projectId),
    getMemberWorkload(projectId),
    prisma.taskActivity.findMany({
      where: { task: { projectId } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 10,
      select: {
        id: true,
        taskId: true,
        type: true,
        field: true,
        oldValue: true,
        newValue: true,
        createdAt: true,
        actor: { select: safeUserSelect },
        task: { select: { id: true, taskNumber: true, title: true } },
      },
    }),
  ]);

  return {
    overview: { ...taskSummary, totalRequirements, totalMembers },
    tasksByStatus: withZeroCounts(TASK_STATUSES, statusGroups, "status"),
    tasksByPriority: withZeroCounts(TASK_PRIORITIES, priorityGroups, "priority"),
    tasksByType: withZeroCounts(TASK_TYPES, typeGroups, "type"),
    requirementsByStatus: withZeroCounts(REQUIREMENT_STATUSES, requirementGroups, "status"),
    activeSprint,
    memberWorkload,
    recentActivity,
  };
};

module.exports = {
  getDashboard,
};
