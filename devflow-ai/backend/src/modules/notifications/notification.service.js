const prisma = require("../../config/prisma");

const safeActorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
};

const safeNotificationSelect = {
  id: true,
  userId: true,
  actorId: true,
  projectId: true,
  type: true,
  title: true,
  message: true,
  entityType: true,
  entityId: true,
  isRead: true,
  readAt: true,
  createdAt: true,
  updatedAt: true,
  actor: { select: safeActorSelect },
};

const createNotification = async ({ db = prisma, userId, actorId, projectId, type, title, message, entityType, entityId }) => db.notification.create({
  data: {
    userId,
    actorId: actorId || null,
    projectId: projectId || null,
    type,
    title,
    message,
    entityType: entityType || null,
    entityId: entityId || null,
  },
  select: safeNotificationSelect,
});

const listNotifications = async ({ userId, page, limit }) => {
  const skip = (page - 1) * limit;
  const [notifications, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: limit,
      select: safeNotificationSelect,
    }),
    prisma.notification.count({ where: { userId } }),
  ]);

  return { notifications, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const unreadCount = (userId) => prisma.notification.count({ where: { userId, isRead: false } });

const markNotificationRead = async ({ userId, notificationId }) => {
  const notification = await prisma.notification.findFirst({ where: { id: notificationId, userId }, select: { id: true, isRead: true } });
  if (!notification) throw new Error("NOTIFICATION_NOT_FOUND");

  return prisma.notification.update({
    where: { id: notificationId },
    data: notification.isRead ? {} : { isRead: true, readAt: new Date() },
    select: safeNotificationSelect,
  });
};

const markAllNotificationsRead = async (userId) => {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return { updatedCount: result.count };
};

module.exports = {
  createNotification,
  listNotifications,
  unreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};
