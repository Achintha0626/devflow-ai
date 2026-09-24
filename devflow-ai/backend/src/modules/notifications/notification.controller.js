const {
  listNotifications,
  unreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} = require("./notification.service");
const { notificationQuerySchema } = require("./notification.validation");

const list = async (req, res) => {
  const query = notificationQuerySchema.safeParse(req.query);
  if (!query.success) return res.status(400).json({ success: false, message: "Invalid notification pagination" });

  try {
    return res.status(200).json({ success: true, data: await listNotifications({ userId: req.user.id, ...query.data }) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const countUnread = async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: { count: await unreadCount(req.user.id) } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const markRead = async (req, res) => {
  try {
    const notification = await markNotificationRead({ userId: req.user.id, notificationId: req.params.notificationId });
    return res.status(200).json({ success: true, message: "Notification marked as read", data: notification });
  } catch (error) {
    if (error.message === "NOTIFICATION_NOT_FOUND") return res.status(404).json({ success: false, message: "Notification not found" });
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const markAllRead = async (req, res) => {
  try {
    const result = await markAllNotificationsRead(req.user.id);
    return res.status(200).json({ success: true, message: "Notifications marked as read", data: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  list,
  countUnread,
  markRead,
  markAllRead,
};
