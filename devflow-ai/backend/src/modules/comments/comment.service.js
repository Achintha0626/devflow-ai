const prisma = require("../../config/prisma");
const { createNotification } = require("../notifications/notification.service");

const safeAuthorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
};

const safeCommentSelect = {
  id: true,
  taskId: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  author: { select: safeAuthorSelect },
};

const findTask = (taskId, projectId) => prisma.task.findFirst({
  where: { id: taskId, projectId },
  select: { id: true },
});

const getScopedComment = ({ projectId, taskId, commentId }) => prisma.comment.findFirst({
  where: {
    id: commentId,
    taskId,
    task: { projectId },
  },
  select: {
    ...safeCommentSelect,
    authorId: true,
  },
});

const hasManagementAccess = ({ workspaceRole, projectRole }) => ["ADMIN", "PROJECT_MANAGER"].includes(workspaceRole)
  || projectRole === "PROJECT_MANAGER";

const createComment = async ({ projectId, taskId, authorId, content }) => prisma.$transaction(async (tx) => {
  const task = await tx.task.findFirst({ where: { id: taskId, projectId }, select: { id: true, taskNumber: true, assigneeId: true } });
  if (!task) throw new Error("TASK_NOT_FOUND");

  const comment = await tx.comment.create({
    data: { taskId, authorId, content },
    select: safeCommentSelect,
  });
  const notification = task.assigneeId && task.assigneeId !== authorId
    ? await createNotification({
      db: tx,
      userId: task.assigneeId,
      actorId: authorId,
      projectId,
      type: "COMMENT_ADDED",
      title: "New comment on your task",
      message: `A new comment was added to ${task.taskNumber}`,
      entityType: "TASK",
      entityId: task.id,
    })
    : null;
  return { comment, notification };
});

const listComments = async ({ projectId, taskId }) => {
  const task = await findTask(taskId, projectId);
  if (!task) throw new Error("TASK_NOT_FOUND");

  return prisma.comment.findMany({
    where: { taskId, task: { projectId } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: safeCommentSelect,
  });
};

const getComment = async ({ projectId, taskId, commentId }) => {
  const comment = await getScopedComment({ projectId, taskId, commentId });
  if (!comment) return null;
  const { authorId, ...safeComment } = comment;
  return safeComment;
};

const updateComment = async ({ projectId, taskId, commentId, userId, workspaceRole, projectRole, content }) => {
  const comment = await getScopedComment({ projectId, taskId, commentId });
  if (!comment) throw new Error("COMMENT_NOT_FOUND");

  if (comment.authorId !== userId && !hasManagementAccess({ workspaceRole, projectRole })) {
    throw new Error("COMMENT_FORBIDDEN");
  }

  return prisma.comment.update({
    where: { id: commentId },
    data: { content },
    select: safeCommentSelect,
  });
};

const deleteComment = async ({ projectId, taskId, commentId, userId, workspaceRole, projectRole }) => {
  const comment = await getScopedComment({ projectId, taskId, commentId });
  if (!comment) throw new Error("COMMENT_NOT_FOUND");

  if (comment.authorId !== userId && !hasManagementAccess({ workspaceRole, projectRole })) {
    throw new Error("COMMENT_FORBIDDEN");
  }

  await prisma.comment.delete({ where: { id: commentId } });
};

module.exports = {
  createComment,
  listComments,
  getComment,
  updateComment,
  deleteComment,
};
