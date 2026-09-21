const express = require("express");
const authRoutes = require("./modules/auth/auth.routes");
const workspaceRoutes = require("./modules/workspace/workspace.routes");
const projectRoutes = require("./modules/project/project.routes");

const app = express();

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

module.exports = app;