const {
  createComment,
  listComments,
  getComment,
  updateComment,
  deleteComment,
} = require("./comment.service");

const internalError = (res, error) => {
  console.error(error);
  return res.status(500).json({ success: false, message: "Internal server error" });
};

const handleError = (res, error) => {
  if (error.message === "TASK_NOT_FOUND" || error.message === "COMMENT_NOT_FOUND") {
    return res.status(404).json({
      success: false,
      message: error.message === "TASK_NOT_FOUND" ? "Task not found" : "Comment not found",
    });
  }
  if (error.message === "COMMENT_FORBIDDEN") {
    return res.status(403).json({ success: false, message: "You cannot modify this comment" });
  }
  return internalError(res, error);
};

const create = async (req, res) => {
  try {
    const comment = await createComment({
      projectId: req.project.id,
      taskId: req.params.taskId,
      authorId: req.user.id,
      content: req.body.content,
    });
    return res.status(201).json({ success: true, message: "Comment created successfully", data: comment });
  } catch (error) {
    return handleError(res, error);
  }
};

const list = async (req, res) => {
  try {
    const comments = await listComments({ projectId: req.project.id, taskId: req.params.taskId });
    return res.status(200).json({ success: true, data: comments });
  } catch (error) {
    return handleError(res, error);
  }
};

const getById = async (req, res) => {
  try {
    const comment = await getComment({
      projectId: req.project.id,
      taskId: req.params.taskId,
      commentId: req.params.commentId,
    });
    if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });
    return res.status(200).json({ success: true, data: comment });
  } catch (error) {
    return handleError(res, error);
  }
};

const update = async (req, res) => {
  try {
    const comment = await updateComment({
      projectId: req.project.id,
      taskId: req.params.taskId,
      commentId: req.params.commentId,
      userId: req.user.id,
      workspaceRole: req.workspaceMember.role,
      projectRole: req.projectMember?.role,
      content: req.body.content,
    });
    return res.status(200).json({ success: true, message: "Comment updated successfully", data: comment });
  } catch (error) {
    return handleError(res, error);
  }
};

const remove = async (req, res) => {
  try {
    await deleteComment({
      projectId: req.project.id,
      taskId: req.params.taskId,
      commentId: req.params.commentId,
      userId: req.user.id,
      workspaceRole: req.workspaceMember.role,
      projectRole: req.projectMember?.role,
    });
    return res.status(200).json({ success: true, message: "Comment deleted successfully" });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
};
