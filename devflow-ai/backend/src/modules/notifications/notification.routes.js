const express = require("express");
const authenticate = require("../../middleware/authenticate");
const {
  list,
  countUnread,
  markRead,
  markAllRead,
} = require("./notification.controller");

const router = express.Router();

router.use(authenticate);
router.get("/", list);
router.get("/unread-count", countUnread);
router.patch("/read-all", markAllRead);
router.patch("/:notificationId/read", markRead);

module.exports = router;
