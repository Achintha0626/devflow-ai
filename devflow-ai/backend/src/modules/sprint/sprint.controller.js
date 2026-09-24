const {
  createSprint,
  listSprints,
  getSprint,
  updateSprint,
  transitionSprint,
  addTaskToSprint,
  removeTaskFromSprint,
  moveTask,
  getBacklog,
  getProgress,
  deleteSprint,
} = require("./sprint.service");
const { sprintFilterSchema, backlogFilterSchema } = require("./sprint.validation");
const { emitToProject } = require("../../socket/socket");

const internalError = (res, error) => {
  console.error(error);
  return res.status(500).json({ success: false, message: "Internal server error" });
};

const handleError = (res, error) => {
  const notFound = ["SPRINT_NOT_FOUND", "TASK_NOT_FOUND", "TASK_NOT_IN_SPRINT"];
  if (notFound.includes(error.message)) {
    const message = error.message === "TASK_NOT_FOUND" || error.message === "TASK_NOT_IN_SPRINT" ? "Task not found in sprint" : "Sprint not found";
    return res.status(404).json({ success: false, message });
  }
  const conflicts = {
    INVALID_SPRINT_TRANSITION: "Invalid sprint lifecycle transition",
    ACTIVE_SPRINT_EXISTS: "Project already has an active sprint",
    TASK_ALREADY_IN_SPRINT: "Task is already in this sprint",
    TASK_ALREADY_ASSIGNED: "Task already belongs to another sprint",
    ACTIVE_SPRINT_CANNOT_DELETE: "Active sprints cannot be deleted",
  };
  if (conflicts[error.message]) return res.status(409).json({ success: false, message: conflicts[error.message] });
  if (error.message === "INVALID_DATE_RANGE") return res.status(400).json({ success: false, message: "endDate must be after startDate" });
  return internalError(res, error);
};

const create = async (req, res) => {
  try {
    const sprint = await createSprint({ projectId: req.project.id, userId: req.user.id, ...req.body });
    return res.status(201).json({ success: true, message: "Sprint created successfully", data: sprint });
  } catch (error) { return handleError(res, error); }
};

const list = async (req, res) => {
  const filters = sprintFilterSchema.safeParse(req.query);
  if (!filters.success) return res.status(400).json({ success: false, message: "Invalid sprint filters" });
  try {
    return res.status(200).json({ success: true, data: await listSprints({ projectId: req.project.id, ...filters.data }) });
  } catch (error) { return handleError(res, error); }
};

const getById = async (req, res) => {
  try {
    const sprint = await getSprint({ projectId: req.project.id, sprintId: req.params.sprintId });
    if (!sprint) return res.status(404).json({ success: false, message: "Sprint not found" });
    return res.status(200).json({ success: true, data: sprint });
  } catch (error) { return handleError(res, error); }
};

const update = async (req, res) => {
  try {
    return res.status(200).json({ success: true, message: "Sprint updated successfully", data: await updateSprint({ projectId: req.project.id, sprintId: req.params.sprintId, ...req.body }) });
  } catch (error) { return handleError(res, error); }
};

const lifecycle = (transition) => async (req, res) => {
  try {
    const sprint = await transitionSprint({ projectId: req.project.id, sprintId: req.params.sprintId, transition });
    const messages = { start: "Sprint started successfully", complete: "Sprint completed successfully", cancel: "Sprint cancelled successfully" };
    return res.status(200).json({ success: true, message: messages[transition], data: sprint });
  } catch (error) { return handleError(res, error); }
};

const addTask = async (req, res) => {
  try {
    const task = await addTaskToSprint({ projectId: req.project.id, sprintId: req.params.sprintId, taskId: req.body.taskId, userId: req.user.id });
    emitToProject(req.project.id, "task:sprint-changed", { projectId: req.project.id, actorId: req.user.id, task, oldSprintId: null, newSprintId: req.params.sprintId });
    return res.status(200).json({ success: true, message: "Task added to sprint successfully", data: task });
  } catch (error) { return handleError(res, error); }
};

const removeTask = async (req, res) => {
  try {
    await removeTaskFromSprint({ projectId: req.project.id, sprintId: req.params.sprintId, taskId: req.params.taskId, userId: req.user.id });
    emitToProject(req.project.id, "task:sprint-changed", { projectId: req.project.id, actorId: req.user.id, taskId: req.params.taskId, oldSprintId: req.params.sprintId, newSprintId: null });
    return res.status(200).json({ success: true, message: "Task returned to backlog successfully" });
  } catch (error) { return handleError(res, error); }
};

const move = async (req, res) => {
  try {
    const result = await moveTask({ projectId: req.project.id, taskId: req.params.taskId, sprintId: req.body.sprintId, userId: req.user.id });
    if (result.changed) {
      emitToProject(req.project.id, "task:sprint-changed", {
        projectId: req.project.id,
        actorId: req.user.id,
        task: result.task,
        oldSprintId: result.oldSprintId,
        newSprintId: result.newSprintId,
      });
    }
    return res.status(200).json({ success: true, message: "Task sprint updated successfully", data: result.task });
  } catch (error) { return handleError(res, error); }
};

const backlog = async (req, res) => {
  const filters = backlogFilterSchema.safeParse(req.query);
  if (!filters.success) return res.status(400).json({ success: false, message: "Invalid backlog filters" });
  try {
    return res.status(200).json({ success: true, data: await getBacklog({ projectId: req.project.id, filters: filters.data }) });
  } catch (error) { return handleError(res, error); }
};

const progress = async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: await getProgress({ projectId: req.project.id, sprintId: req.params.sprintId }) });
  } catch (error) { return handleError(res, error); }
};

const remove = async (req, res) => {
  try {
    await deleteSprint({ projectId: req.project.id, sprintId: req.params.sprintId });
    return res.status(200).json({ success: true, message: "Sprint deleted successfully" });
  } catch (error) { return handleError(res, error); }
};

module.exports = {
  create,
  list,
  getById,
  update,
  start: lifecycle("start"),
  complete: lifecycle("complete"),
  cancel: lifecycle("cancel"),
  addTask,
  removeTask,
  move,
  backlog,
  progress,
  remove,
};
