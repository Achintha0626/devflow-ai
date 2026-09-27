const { Worker } = require("bullmq");
const { createWorkerRedisConnection } = require("../config/redis");
const { TASK_RISK_QUEUE_NAME } = require("../queues/task-risk.queue");
const { predictTaskRisk } = require("../modules/task-risk/task-risk.service");

let worker;
const WORKER_ERROR_LOG_WINDOW_MS = 30_000;
let lastWorkerErrorKey;
let lastWorkerErrorAt = 0;
let workerHadConnectionError = false;

const processTaskRiskJob = async (job) => {
  const { workspaceId, projectId, taskId, reason } = job.data || {};
  if (!workspaceId || !projectId || !taskId || !reason) {
    throw new Error("Invalid task-risk job payload");
  }

  return predictTaskRisk({ workspaceId, projectId, taskId });
};

const startTaskRiskWorker = () => {
  if (worker) return worker;

  worker = new Worker(TASK_RISK_QUEUE_NAME, processTaskRiskJob, {
    connection: createWorkerRedisConnection(),
    concurrency: 2,
  });
  worker.on("completed", (job) => {
    console.log("[TaskRiskWorker] Risk evaluation completed", { jobId: job.id, taskId: job.data.taskId, reason: job.data.reason });
  });
  worker.on("failed", (job, error) => {
    console.error("[TaskRiskWorker] Risk evaluation failed", {
      jobId: job?.id,
      taskId: job?.data?.taskId,
      reason: job?.data?.reason,
      message: error.message,
    });
  });
  worker.on("error", (error) => {
    const message = error?.message || error?.code || error?.name || "Redis connection error";
    const errorKey = `${error?.code || ""}:${error?.name || ""}:${message}`;
    const now = Date.now();
    workerHadConnectionError = true;
    if (errorKey === lastWorkerErrorKey && now - lastWorkerErrorAt < WORKER_ERROR_LOG_WINDOW_MS) return;
    lastWorkerErrorKey = errorKey;
    lastWorkerErrorAt = now;
    console.error("[TaskRiskWorker] Worker error", { message });
  });
  worker.on("ready", () => {
    if (workerHadConnectionError) console.log("[TaskRiskWorker] Worker ready");
    workerHadConnectionError = false;
  });

  return worker;
};

const closeTaskRiskWorker = async () => {
  if (!worker) return;
  await worker.close();
  worker = undefined;
  lastWorkerErrorKey = undefined;
  lastWorkerErrorAt = 0;
  workerHadConnectionError = false;
};

module.exports = {
  startTaskRiskWorker,
  closeTaskRiskWorker,
};
