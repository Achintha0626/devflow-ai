const { predictTaskRisk } = require("./task-risk.service");

const getRisk = async (req, res) => {
  try {
    const result = await predictTaskRisk({
      workspaceId: req.params.workspaceId,
      projectId: req.params.projectId,
      taskId: req.params.taskId,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.message === "TASK_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Task not found" });
    }
    if (error.message.startsWith("ML_SERVICE_")) {
      return res.status(502).json({ success: false, message: "Task risk prediction service unavailable" });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getRisk,
};
