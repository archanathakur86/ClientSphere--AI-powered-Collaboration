import express from "express";
import { protectAny } from "../middleware/auth.js";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../controllers/notificationController.js";

const router = express.Router();
router.use(protectAny);

router.get("/", getNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:notificationId/read", markNotificationRead);

export default router;