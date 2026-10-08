import Notification from "../models/Notification.js";

let realtimeIo = null;

export const setRealtimeIO = (io) => {
  realtimeIo = io;
};

export const recipientKeyForUser = (user) => {
  if (!user) return null;
  if (user.role === "client") return `client:${user.projectId}`;
  return `user:${user._id}`;
};

export const createNotification = async ({ recipientKey, project, type, title, message = "", metadata = {} }) => {
  const notification = await Notification.create({ recipientKey, project, type, title, message, metadata });
  if (realtimeIo) {
    realtimeIo.to(recipientKey).emit("notification:new", notification);
  }
  return notification;
};

export const createProjectNotifications = async (project, type, title, message = "", metadata = {}, recipients = []) => {
  const keys = recipients.length ? recipients : [];
  const created = [];
  for (const recipientKey of keys) {
    created.push(await createNotification({ recipientKey, project: project._id, type, title, message, metadata }));
  }
  return created;
};

export const markNotificationsRead = async ({ recipientKey, notificationIds = null }) => {
  const query = { recipientKey, readAt: null };
  if (notificationIds?.length) query._id = { $in: notificationIds };
  return Notification.updateMany(query, { $set: { readAt: new Date() } });
};

export const getUnreadCount = async (recipientKey) => {
  return Notification.countDocuments({ recipientKey, readAt: null });
};
