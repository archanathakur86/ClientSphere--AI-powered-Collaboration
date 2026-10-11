import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import { Server } from "socket.io";
import cron from "node-cron";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import connectDB from "./config/db.js";

import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { nosqlSanitizer } from "./middleware/nosqlSanitize.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import User from "./models/User.js";
import Project from "./models/Project.js";
import ClientInvite from "./models/ClientInvite.js";
import { setRealtimeIO } from "./services/notificationService.js";
import { processOverdueInvoices } from "./controllers/invoiceController.js";
import { sendWeeklyClientUpdates } from "./services/weeklyUpdateJob.js";
import { getProjectRecipientKeys } from "./services/realtimeHelpers.js";

import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import assistantRoutes from "./routes/assistantRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import clientProjectRoutes from "./routes/clientProjectRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import projectInvoiceRoutes from "./routes/projectInvoiceRoutes.js";

dotenv.config();

// Environment check
const requiredEnvVars = [
  "MONGO_URI",
  "JWT_SECRET",
  "GROQ_API_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

if (process.env.NODE_ENV !== "test") {
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  if (missingVars.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missingVars.join(", ")}`);
    process.exit(1);
  }

  if (process.env.NODE_ENV === "production" && !process.env.CLIENT_URL) {
    console.error("FATAL: CLIENT_URL environment variable is required in production.");
    process.exit(1);
  }
}

connectDB();

const app = express();
const server = http.createServer(app);

const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: { origin: allowedOrigin, methods: ["GET", "POST"] },
});

setRealtimeIO(io);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(" ")?.[1];
    if (!token) return next(new Error("Authentication required"));
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role === "client") {
      // Same rule as the HTTP middleware: a revoked or expired invite kills the socket too.
      const invite = await ClientInvite.findById(payload.inviteId);
      if (!invite || invite.revokedAt || invite.expiresAt <= new Date()) {
        return next(new Error("Authentication required"));
      }
      socket.data.user = payload;
    } else {
      socket.data.user = { _id: payload.id, role: "owner" };
    }
    return next();
  } catch (err) {
    return next(new Error("Authentication required"));
  }
});

app.use(helmet());
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use("/api/payments", paymentRoutes);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(nosqlSanitizer);

// Apply general API rate limiter
app.use("/api", apiLimiter);

// attach io to req so controllers can emit real-time events if needed
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.get("/", (req, res) => {
  res.json({ success: true, message: "ClientSphere API is running" });
});
// Health check for uptime monitors and hosting platforms.
// Returns 200 when the API and its database are ready, 503 while the database is still connecting or down.
// Kept outside /api so the rate limiter never blocks a monitor.
const DB_STATES = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
app.get("/health", (req, res) => {
  const db = DB_STATES[mongoose.connection.readyState] || "unknown";
  const ready = db === "connected";
  res.status(ready ? 200 : 503).json({
    status: ready ? "ok" : "starting",
    db,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects", projectInvoiceRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/client/projects", clientProjectRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/invoices", invoiceRoutes);

// Socket.io - real-time presence & collaboration indicators
const projectOnlineUsers = new Map();

const emitPresence = async (projectId) => {
  const users = projectOnlineUsers.get(projectId) || new Map();
  const online = [...users.values()];
  io.to(`project_${projectId}`).emit("project_presence", { projectId, online });
};

const canJoinProject = async (socket, projectId) => {
  if (socket.data.user?.role === "client") {
    return socket.data.user.projectId === projectId;
  }
  const project = await Project.findById(projectId);
  if (!project) return false;
  const userId = socket.data.user._id;
  return project.owner.toString() === userId || project.members.some((m) => m.user.toString() === userId);
};

io.on("connection", (socket) => {
  const userRoom = socket.data.user?.role === "client" ? `client:${socket.data.user.projectId}` : `user:${socket.data.user._id}`;
  socket.join(userRoom);

  socket.on("join_project", async (projectId) => {
    if (!(await canJoinProject(socket, projectId))) return;
    socket.join(`project_${projectId}`);
    const user = socket.data.user;
    const users = projectOnlineUsers.get(projectId) || new Map();
    users.set(user._id || user.projectId, {
      id: user._id || user.projectId,
      name: user.name || user.email || "Client",
      role: user.role || "owner",
    });
    projectOnlineUsers.set(projectId, users);
    await emitPresence(projectId);
  });

  socket.on("leave_project", async (projectId) => {
    socket.leave(`project_${projectId}`);
    const users = projectOnlineUsers.get(projectId);
    if (users) {
      users.delete(socket.data.user._id || socket.data.user.projectId);
      await emitPresence(projectId);
    }
  });

  socket.on("editing_note", ({ projectId, noteId, userName }) => {
    socket.to(`project_${projectId}`).emit("someone_editing", { noteId, userName });
  });

  socket.on("mark_notifications_read", async ({ notificationIds = [] } = {}) => {
    socket.emit("notifications:ack", { notificationIds });
  });

  socket.on("disconnect", () => {
    for (const [projectId, users] of projectOnlineUsers.entries()) {
      users.delete(socket.data.user._id || socket.data.user.projectId);
      if (users.size === 0) projectOnlineUsers.delete(projectId);
      else emitPresence(projectId);
    }
  });
});

if (process.env.NODE_ENV !== "test") {
  cron.schedule("0 8 * * *", async () => {
    try {
      await processOverdueInvoices();
    } catch (error) {
      console.error("Overdue invoice job failed:", error.message);
    }
  });
  cron.schedule("0 9 * * 1", async () => {
    try {
      await sendWeeklyClientUpdates();
    } catch (error) {
      console.error("Weekly client update job failed:", error.message);
    }
  });
}

app.use(notFound);
app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`ClientSphere backend running on port ${PORT}`);
  });
}

export { app, server };