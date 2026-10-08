import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import api, { getActiveToken } from "../api/axios.js";

const socketBase = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

export function useRealtime({ projectId = null, enabled = true, token: explicitToken = null } = {}) {
  const token = explicitToken || getActiveToken();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!enabled || !token) return undefined;

    const nextSocket = io(socketBase, {
      transports: ["websocket"],
      auth: { token },
    });

    nextSocket.on("connect", () => {
      if (projectId) nextSocket.emit("join_project", projectId);
    });

    nextSocket.on("notification:new", (notification) => {
      setNotifications((current) => [notification, ...current].slice(0, 50));
      setUnreadCount((count) => count + 1);
    });

    nextSocket.on("project_presence", ({ online = [] }) => {
      setOnlineUsers(online);
    });

    nextSocket.on("disconnect", () => {
      if (projectId) nextSocket.emit("leave_project", projectId);
    });

    setSocket(nextSocket);

    return () => {
      if (projectId) nextSocket.emit("leave_project", projectId);
      nextSocket.disconnect();
    };
  }, [enabled, projectId, token]);

  useEffect(() => {
    if (!enabled || !token) return undefined;
    api
      .get("/notifications")
      .then((res) => {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      })
      .catch(() => null);
  }, [enabled, token]);

  const markNotificationRead = async (notificationId) => {
    await api.patch(`/notifications/${notificationId}/read`);
    setNotifications((current) => current.map((item) => (item._id === notificationId ? { ...item, readAt: new Date().toISOString() } : item)));
    setUnreadCount((count) => Math.max(0, count - 1));
  };

  const markAllRead = async () => {
    await api.patch("/notifications/read-all");
    setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
    setUnreadCount(0);
  };

  return useMemo(
    () => ({ socket, notifications, unreadCount, onlineUsers, markNotificationRead, markAllRead, setNotifications }),
    [socket, notifications, unreadCount, onlineUsers]
  );
}