const http = require("http");
const app = require("./app");
const { initializeSocket } = require("./socket/socket");
const { startTaskRiskWorker, closeTaskRiskWorker } = require("./workers/task-risk.worker");
const { closeTaskRiskQueue } = require("./queues/task-risk.queue");

const PORT = 5000;
const server = http.createServer(app);

initializeSocket(server);
startTaskRiskWorker();

server.listen(PORT, () => {
  console.log(`DevFlow AI API running on port ${PORT}`);
});

let shuttingDown = false;
const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[Server] Shutting down (${signal})`);
  try {
    await closeTaskRiskWorker();
    await closeTaskRiskQueue();
  } catch (error) {
    console.error("[Server] Task-risk shutdown error", { message: error.message });
  }
  server.close(() => process.exit(0));
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
