const { Queue } = require("bullmq");
const { createProducerRedisConnection } = require("../config/redis");

const TASK_RISK_QUEUE_NAME = "task-risk";
const JOB_BUCKET_MS = 10_000;

let queue;

const getTaskRiskQueue = () => {
  if (!queue) {
    queue = new Queue(TASK_RISK_QUEUE_NAME, {
      connection: createProducerRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 86400, count: 1000 },
      },
    });
  }
  return queue;
};

const enqueueTaskRiskEvaluation = async ({ workspaceId, projectId, taskId, reason }) => {
  if (!workspaceId || !projectId || !taskId || !reason) return null;

  try {
    const jobId = `risk-${taskId}-${reason}-${Math.floor(Date.now() / JOB_BUCKET_MS)}`;
    return await getTaskRiskQueue().add("evaluate-task-risk", {
      workspaceId,
      projectId,
      taskId,
      reason,
    }, { jobId });
  } catch (error) {
    console.error("[TaskRiskQueue] Failed to enqueue risk evaluation", {
      taskId,
      reason,
      message: error.message,
    });
    return null;
  }
};

const closeTaskRiskQueue = async () => {
  if (!queue) return;
  await queue.close();
  queue = undefined;
};

module.exports = {
  TASK_RISK_QUEUE_NAME,
  getTaskRiskQueue,
  enqueueTaskRiskEvaluation,
  closeTaskRiskQueue,
};
