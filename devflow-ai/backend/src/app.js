const express = require("express");
const cors = require("cors");
const authRoutes = require("./modules/auth/auth.routes");
const workspaceRoutes = require("./modules/workspace/workspace.routes");
const projectRoutes = require("./modules/project/project.routes");
const requirementRoutes = require("./modules/requirement/requirement.routes");
const aiRoutes = require("./modules/ai/ai.routes");
const taskRoutes = require("./modules/tasks/task.routes");
const sprintRoutes = require("./modules/sprint/sprint.routes");
const kanbanRoutes = require("./modules/kanban/kanban.routes");
const commentRoutes = require("./modules/comments/comment.routes");
const taskActivityRoutes = require("./modules/task-activities/task-activity.routes");
const notificationRoutes = require("./modules/notifications/notification.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
const taskRiskRoutes = require("./modules/task-risk/task-risk.routes");

const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
// Reads the allowed frontend origin from FRONTEND_URL (set in .env).
// Falls back to the Vite dev-server default when the variable is absent.
// credentials:true is required for Authorization headers to be forwarded.
// Do NOT use origin:"*" with credentials — browsers reject that combination.
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

app.use(express.json());

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "DevFlow AI API is running",
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/workspaces", workspaceRoutes);
app.use("/api/v1/workspaces", projectRoutes);
app.use("/api/v1/workspaces", requirementRoutes);
app.use("/api/v1/workspaces", aiRoutes);
app.use("/api/v1/workspaces", taskRoutes);
app.use("/api/v1/workspaces", sprintRoutes);
app.use("/api/v1/workspaces", kanbanRoutes);
app.use("/api/v1/workspaces", commentRoutes);
app.use("/api/v1/workspaces", taskActivityRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/workspaces", dashboardRoutes);
app.use("/api/v1/workspaces", taskRiskRoutes);

module.exports = app;