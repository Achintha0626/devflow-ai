const {
  createTask,
  listTasks,
  getTask,
  updateTask,
  updateTaskStatus,
  assignTask,
  deleteTask,
  convertSuggestionToTask,
} = require("./task.service");
const { taskQuerySchema } = require("./task.validation");
const { emitToProject, emitToUser } = require("../../socket/socket");
const { invalidateProjectDashboard } = require("../../services/cache.service");

const internalError = (res, error) => {
  console.error(error);
  return res.status(500).json({ success: false, message: "Internal server error" });
};

const handleTaskError = (res, error) => {
  const notFound = ["TASK_NOT_FOUND", "REQUIREMENT_NOT_FOUND", "SUGGESTION_NOT_FOUND"];
  if (notFound.includes(error.message)) {
    const message = error.message === "REQUIREMENT_NOT_FOUND" ? "Requirement not found" : error.message === "SUGGESTION_NOT_FOUND" ? "AI suggestion not found" : "Task not found";
    return res.status(404).json({ success: false, message });
  }
  if (error.message === "ASSIGNEE_NOT_PROJECT_MEMBER") {
    return res.status(400).json({ success: false, message: "Assignee must be a member of the project" });
  }
  if (error.message === "TASK_STATUS_FORBIDDEN") {
    return res.status(403).json({ success: false, message: "You may only update the status of tasks assigned to you" });
  }
  if (error.message === "TASK_STATUS_UNCHANGED") {
    return res.status(409).json({ success: false, message: "Task already has this status" });
  }
  if (error.message === "INVALID_TASK_STATUS_TRANSITION") {
    return res.status(409).json({ success: false, message: "Invalid task status transition" });
  }
  if (error.message === "SUGGESTION_ALREADY_CONVERTED") {
    return res.status(409).json({ success: false, message: "AI suggestion has already been converted to a task" });
  }
  if (error.message === "SUGGESTION_NOT_CONVERTIBLE") {
    return res.status(409).json({ success: false, message: "Only approved or edited AI suggestions can be converted" });
  }
  if (error.code === "P2002") {
    return res.status(409).json({ success: false, message: "Task could not be created because of a conflicting task number" });
  }
  return internalError(res, error);
};

const create = async (req, res) => {
  try {
    const task = await createTask({ project: req.project, userId: req.user.id, task: req.body });
    await invalidateProjectDashboard(req.project.id);
    emitToProject(req.project.id, "task:created", { projectId: req.project.id, actorId: req.user.id, task });
    return res.status(201).json({ success: true, message: "Task created successfully", data: task });
  } catch (error) {
    return handleTaskError(res, error);
  }
};

const list = async (req, res) => {
  const filters = taskQuerySchema.safeParse(req.query);
  if (!filters.success) {
    return res.status(400).json({ success: false, message: "Invalid task filters" });
  }

  try {
    const tasks = await listTasks({ projectId: req.project.id, filters: filters.data });
    return res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    return handleTaskError(res, error);
  }
};

const getById = async (req, res) => {
  try {
    const task = await getTask({ projectId: req.project.id, taskId: req.params.taskId });
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });
    return res.status(200).json({ success: true, data: task });
  } catch (error) {
    return handleTaskError(res, error);
  }
};

const update = async (req, res) => {
  try {
    const task = await updateTask({ project: req.project, taskId: req.params.taskId, userId: req.user.id, task: req.body });
    await invalidateProjectDashboard(req.project.id);
    emitToProject(req.project.id, "task:updated", { projectId: req.project.id, actorId: req.user.id, task });
    return res.status(200).json({ success: true, message: "Task updated successfully", data: task });
  } catch (error) {
    return handleTaskError(res, error);
  }
};

const updateStatus = async (req, res) => {
  try {
    const result = await updateTaskStatus({
      workspaceId: req.project.workspaceId,
      projectId: req.project.id,
      taskId: req.params.taskId,
      userId: req.user.id,
      workspaceRole: req.workspaceMember.role,
      projectRole: req.projectMember?.role,
      status: req.body.status,
    });
    await invalidateProjectDashboard(req.project.id);
    const task = result.task;
    emitToProject(req.project.id, "task:status-changed", { projectId: req.project.id, actorId: req.user.id, task });
    if (result.notification) emitToUser(result.notification.userId, "notification:new", result.notification);
    return res.status(200).json({ success: true, message: "Task status updated successfully", data: task });
  } catch (error) {
    return handleTaskError(res, error);
  }
};

const assign = async (req, res) => {
  try {
    const result = await assignTask({
      project: req.project,
      taskId: req.params.taskId,
      assigneeId: req.body.assigneeId,
      userId: req.user.id,
    });
    await invalidateProjectDashboard(req.project.id);
    const task = result.task;
    emitToProject(req.project.id, "task:updated", { projectId: req.project.id, actorId: req.user.id, task });
    if (result.notification) emitToUser(result.notification.userId, "notification:new", result.notification);
    return res.status(200).json({ success: true, message: "Task assignee updated successfully", data: task });
  } catch (error) {
    return handleTaskError(res, error);
  }
};

const remove = async (req, res) => {
  try {
    await deleteTask({ projectId: req.project.id, taskId: req.params.taskId });
    await invalidateProjectDashboard(req.project.id);
    return res.status(200).json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    return handleTaskError(res, error);
  }
};

const convertSuggestion = async (req, res) => {
  try {
    const task = await convertSuggestionToTask({
      project: req.project,
      requirementId: req.params.requirementId,
      suggestionId: req.params.suggestionId,
      userId: req.user.id,
      task: req.body,
    });
    await invalidateProjectDashboard(req.project.id);
    emitToProject(req.project.id, "task:created", { projectId: req.project.id, actorId: req.user.id, task });
    return res.status(201).json({ success: true, message: "AI suggestion converted to task successfully", data: task });
  } catch (error) {
    return handleTaskError(res, error);
  }
};

module.exports = {
  create,
  list,
  getById,
  update,
  updateStatus,
  assign,
  remove,
  convertSuggestion,
};
