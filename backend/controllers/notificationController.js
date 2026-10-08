import asyncHandler from "express-async-handler";
import Notification from "../models/Notification.js";
import { markNotificationsRead, recipientKeyForUser } from "../services/notificationService.js";

export const getNotifications = asyncHandler(async (req, res) => {
  const recipientKey = recipientKeyForUser(req.user);
  const notifications = await Notification.find({ recipientKey }).sort({ createdAt: -1 }).limit(50);
  const unreadCount = await Notification.countDocuments({ recipientKey, readAt: null });
  res.json({ success: true, notifications, unreadCount });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const recipientKey = recipientKeyForUser(req.user);
  const notification = await Notification.findOne({ _id: req.params.notificationId, recipientKey });
  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }
  notification.readAt = new Date();
  await notification.save();
  res.json({ success: true, notification });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const recipientKey = recipientKeyForUser(req.user);
  await markNotificationsRead({ recipientKey });
  res.json({ success: true });
});
