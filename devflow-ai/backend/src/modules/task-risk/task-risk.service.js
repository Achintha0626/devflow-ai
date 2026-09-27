const prisma = require("../../config/prisma");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const ML_REQUEST_TIMEOUT_MS = 5000;
const ACTIVE_TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW"];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getTaskContext = async ({ workspaceId, projectId, taskId }) => {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      projectId,
      project: { workspaceId },
    },
    select: {
      id: true,
      taskNumber: true,
      title: true,
      storyPoints: true,
      priority: true,
      type: true,
      createdAt: true,
      dueDate: true,
      assigneeId: true,
      sprint: {
        select: {
          id: true,
          endDate: true,
        },
      },
    },
  });

  if (!task) throw new Error("TASK_NOT_FOUND");
  return task;
};

const buildFeaturePayload = async ({ projectId, task, now }) => {
  const [assigneeGroups, sprintGroups, statusChangeCount] = await Promise.all([
    task.assigneeId
      ? prisma.task.groupBy({
        by: ["status"],
        where: {
          projectId,
          assigneeId: task.assigneeId,
          status: { in: ACTIVE_TASK_STATUSES },
        },
        _count: { _all: true },
        _sum: { storyPoints: true },
      })
      : Promise.resolve([]),
    task.sprint
      ? prisma.task.groupBy({
        by: ["status"],
        where: { projectId, sprintId: task.sprint.id },
        _count: { _all: true },
      })
      : Promise.resolve([]),
    prisma.taskActivity.count({
      where: { taskId: task.id, type: "STATUS_CHANGED" },
    }),
  ]);

  const assigneeActiveTasks = assigneeGroups.reduce((sum, group) => sum + group._count._all, 0);
  const assigneeStoryPointLoad = assigneeGroups.reduce((sum, group) => sum + (group._sum.storyPoints || 0), 0);
  const sprintTotalTasks = sprintGroups.reduce((sum, group) => sum + group._count._all, 0);
  const sprintCompletedTasks = sprintGroups.find((group) => group.status === "DONE")?._count._all || 0;

  const taskAgeDays = Math.max(0, (now.getTime() - task.createdAt.getTime()) / MS_PER_DAY);
  // Development fallback: tasks without due dates use 0 until production due-date policy is defined.
  const daysUntilDue = task.dueDate ? (task.dueDate.getTime() - now.getTime()) / MS_PER_DAY : 0;
  const sprintDaysRemaining = task.sprint?.endDate
    ? Math.max(0, (task.sprint.endDate.getTime() - now.getTime()) / MS_PER_DAY)
    : 0;
  const sprintCompletionPercentage = sprintTotalTasks
    ? Math.min(100, Math.max(0, (sprintCompletedTasks / sprintTotalTasks) * 100))
    : 0;

  return {
    storyPoints: task.storyPoints || 0,
    priority: task.priority,
    taskType: task.type,
    taskAgeDays,
    daysUntilDue,
    assigneeActiveTasks,
    assigneeStoryPointLoad,
    sprintDaysRemaining,
    sprintCompletionPercentage,
    statusChangeCount,
  };
};

const requestPrediction = async (features) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ML_REQUEST_TIMEOUT_MS);
  const url = `${ML_SERVICE_URL.replace(/\/+$/, "")}/predict`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(features),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error("ML_SERVICE_RESPONSE_ERROR");

    let prediction;
    try {
      prediction = await response.json();
    } catch (error) {
      throw new Error("ML_SERVICE_INVALID_JSON");
    }

    const probability = prediction?.delayProbability;
    const validProbability = typeof probability === "number"
      && Number.isFinite(probability)
      && probability >= 0
      && probability <= 1;
    const validRiskLevel = ["LOW", "MEDIUM", "HIGH"].includes(prediction?.riskLevel);
    const validModelVersion = typeof prediction?.modelVersion === "string" && prediction.modelVersion.length > 0;

    if (!validProbability || !validRiskLevel || !validModelVersion) {
      throw new Error("ML_SERVICE_INVALID_PREDICTION");
    }

    return {
      delayProbability: probability,
      riskLevel: prediction.riskLevel,
      modelVersion: prediction.modelVersion,
    };
  } catch (error) {
    if (error.name === "AbortError") throw new Error("ML_SERVICE_TIMEOUT");
    if (error.message === "ML_SERVICE_RESPONSE_ERROR"
      || error.message === "ML_SERVICE_INVALID_JSON"
      || error.message === "ML_SERVICE_INVALID_PREDICTION"
      || error.message === "ML_SERVICE_TIMEOUT") throw error;
    throw new Error("ML_SERVICE_UNAVAILABLE");
  } finally {
    clearTimeout(timeout);
  }
};

const predictTaskRisk = async ({ workspaceId, projectId, taskId }) => {
  const task = await getTaskContext({ workspaceId, projectId, taskId });
  const now = new Date();
  const features = await buildFeaturePayload({ projectId, task, now });
  const prediction = await requestPrediction(features);
  const persistedPrediction = await prisma.taskRiskPrediction.create({
    data: {
      taskId: task.id,
      delayProbability: prediction.delayProbability,
      riskLevel: prediction.riskLevel,
      modelVersion: prediction.modelVersion,
      featureSnapshot: features,
      predictedAt: now,
    },
    select: {
      id: true,
      delayProbability: true,
      riskLevel: true,
      modelVersion: true,
    },
  });

  return {
    task: {
      id: task.id,
      taskNumber: task.taskNumber,
      title: task.title,
    },
    prediction: persistedPrediction,
    features,
    predictedAt: now.toISOString(),
  };
};

const getTaskRiskHistory = async ({ workspaceId, projectId, taskId }) => {
  const task = await getTaskContext({ workspaceId, projectId, taskId });
  const predictions = await prisma.taskRiskPrediction.findMany({
    where: { taskId: task.id },
    orderBy: [{ predictedAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      delayProbability: true,
      riskLevel: true,
      modelVersion: true,
      featureSnapshot: true,
      predictedAt: true,
    },
  });

  return {
    task: {
      id: task.id,
      taskNumber: task.taskNumber,
      title: task.title,
    },
    predictions,
  };
};

module.exports = {
  predictTaskRisk,
  getTaskRiskHistory,
};
