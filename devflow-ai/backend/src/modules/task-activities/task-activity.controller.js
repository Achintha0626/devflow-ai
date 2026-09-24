const { listTaskActivities } = require("./task-activity.service");

const list = async (req, res) => {
  try {
    const activities = await listTaskActivities({
      projectId: req.project.id,
      taskId: req.params.taskId,
    });
    return res.status(200).json({ success: true, data: activities });
  } catch (error) {
    if (error.message === "TASK_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Task not found" });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { list };
