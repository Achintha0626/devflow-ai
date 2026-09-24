const prisma = require("../../config/prisma");

const safeActorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
};

const serializeActivityValue = (value) => {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const recordTaskActivity = async ({ db, taskId, actorId, type, field, oldValue, newValue }) => db.taskActivity.create({
  data: {
    taskId,
    actorId,
    type,
    ...(field !== undefined ? { field } : {}),
    ...(oldValue !== undefined ? { oldValue: serializeActivityValue(oldValue) } : {}),
    ...(newValue !== undefined ? { newValue: serializeActivityValue(newValue) } : {}),
  },
});

const listTaskActivities = async ({ projectId, taskId }) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId },
    select: { id: true },
  });
  if (!task) throw new Error("TASK_NOT_FOUND");

  return prisma.taskActivity.findMany({
    where: { taskId, task: { projectId } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      taskId: true,
      type: true,
      field: true,
      oldValue: true,
      newValue: true,
      createdAt: true,
      actor: { select: safeActorSelect },
    },
  });
};

module.exports = {
  recordTaskActivity,
  listTaskActivities,
};
