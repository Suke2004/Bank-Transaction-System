const express = require("express");
const notificationController = require("../controllers/notification.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

const router = express.Router();

// Enforce authMiddleware for all notification routes
router.use(authMiddleware);

/* GET /api/v1/notifications - List user's notifications */
router.get("/", notificationController.getNotifications);

/* PATCH /api/v1/notifications/read - Mark all read */
router.patch("/read", notificationController.markAllRead);

/* PATCH /api/v1/notifications/:id/read - Mark a single notification read */
router.patch("/:id/read", notificationController.markOneRead);

module.exports = router;
