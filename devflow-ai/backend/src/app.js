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
app.set("trust proxy", 1);

const parseAllowedOrigins = (value) => {
  if (!value) return ["http://localhost:5173"];
  return value.split(",").map((origin) => origin.trim()).filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins(process.env.FRONTEND_URL);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS_ORIGIN_DENIED"));
  },
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

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, req, res, next) => {
  if (err.message === "CORS_ORIGIN_DENIED") {
    return res.status(403).json({ success: false, message: "Cross-origin request blocked" });
  }
  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Internal server error" : (err.message || "Internal server error"),
  });
});

module.exports = app;