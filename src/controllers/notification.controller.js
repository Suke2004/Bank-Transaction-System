const notificationModel = require("../models/notification.model");
const asyncHandler = require("../utils/asyncHandler");

/**
 * GET /api/v1/notifications
 * Returns paginated list of notifications for the user, with option to filter by unread status.
 */
const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 20, unreadOnly } = req.query;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const query = { user: userId };
  if (unreadOnly === "true") {
    query.read = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    notificationModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    notificationModel.countDocuments(query),
    notificationModel.countDocuments({ user: userId, read: false }),
  ]);

  res.status(200).json({
    notifications,
    unreadCount,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

/**
 * PATCH /api/v1/notifications/read
 * Marks all notifications for this user as read.
 */
const markAllRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await notificationModel.updateMany({ user: userId, read: false }, { read: true });

  res.status(200).json({ message: "All notifications marked as read" });
});

/**
 * PATCH /api/v1/notifications/:id/read
 * Marks a single notification as read.
 */
const markOneRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const notificationId = req.params.id;

  const notification = await notificationModel.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true },
    { new: true },
  );

  if (!notification) {
    return res.status(404).json({ message: "Notification not found or access denied" });
  }

  res.status(200).json({ message: "Notification marked as read", notification });
});

module.exports = {
  getNotifications,
  markAllRead,
  markOneRead,
};
