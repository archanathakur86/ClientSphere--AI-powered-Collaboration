import asyncHandler from "express-async-handler";
import Note from "../models/Note.js";
import FileItem from "../models/FileItem.js";
import Comment from "../models/Comment.js";
import Milestone from "../models/Milestone.js";
import Invoice from "../models/Invoice.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import {
  generateReadme,
  generateWeeklyReport,
  generatePlainLanguageWeeklyUpdate,
  generateEmbedding,
  answerWithSources,
  generateHealthReason,
  extractActionItems,
} from "../services/groqService.js";
import { logActivity } from "./projectController.js";
import { createNotification } from "../services/notificationService.js";
import { loadProjectForUser } from "../middleware/projectAccess.js";
import { sendEmail } from "../services/emailService.js";
import { weeklyUpdateEmail } from "../services/emailTemplates.js";

const VECTOR_INDEX_NAME = process.env.ATLAS_VECTOR_INDEX || "embedding_index";

const TASK_STATUSES = ["todo", "in-progress", "done"];
const TASK_PRIORITIES = ["low", "medium", "high"];
const TASK_STATUS_LABELS = { todo: "To do", "in-progress": "In progress", done: "Done" };

// Readable wording for the raw action codes stored in project.activityLog
const ACTION_LABELS = {
  note_created: "created note",
  file_uploaded: "uploaded file",
  member_added: "member added",
  member_removed: "removed a member",
  task_status_changed: "changed task status",
  tasks_extracted: "extracted tasks from note",
};

const isoDate = (d) => new Date(d).toISOString().slice(0, 10);

const summarizeMilestones = (milestones = []) =>
  milestones.length
    ? milestones
        .map((milestone) => `${milestone.title} — ${milestone.status}${milestone.dueDate ? ` — due ${isoDate(milestone.dueDate)}` : ""}`)
        .join("\n")
    : "No milestones yet.";

const summarizeTasks = (tasks = []) =>
  tasks.length
    ? tasks.map((task) => `${task.title} — ${task.status}${task.priority ? ` — priority ${task.priority}` : ""}`).join("\n")
    : "No tasks yet.";

const loadVectorSearch = async ({ model, projectId, queryEmbedding, fields, limit = 6, titleField = "title" }) => {
  try {
    const pipeline = [
      {
        $vectorSearch: {
          index: VECTOR_INDEX_NAME,
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 50,
          limit,
          filter: { project: projectId },
        },
      },
      {
        $project: {
          ...fields.reduce((acc, field) => {
            acc[field] = 1;
            return acc;
          }, {}),
          score: { $meta: "vectorSearchScore" },
        },
      },
    ];
    return await model.aggregate(pipeline);
  } catch (error) {
    const docs = await model.find({ project: projectId }).select(fields.join(" ")).limit(200);
    return docs
      .map((doc) => ({
        _id: doc._id,
        score: doc.embedding?.length ? queryEmbedding.reduce((sum, value, index) => sum + (Number(value) || 0) * (Number(doc.embedding[index]) || 0), 0) : 0,
        ...fields.reduce((acc, field) => {
          acc[field] = doc[field];
          return acc;
        }, {}),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);
  }
};

// @route POST /api/projects/:projectId/ai/readme
export const generateProjectReadme = asyncHandler(async (req, res) => {
  const project = req.project;
  const files = await FileItem.find({ project: project._id }).select("originalName fileType").limit(50);
  const notes = await Note.find({ project: project._id }).select("title content").limit(20);

  const fileSummaries = files.map((f) => `- ${f.originalName} (${f.fileType})`);
  const noteSummaries = notes.map((n) => `- ${n.title}: ${n.content.slice(0, 120)}`);

  const readme = await generateReadme(project.name, project.description, fileSummaries, noteSummaries);
  project.readme = readme;
  await project.save();

  res.json({ success: true, readme });
});

// @route GET /api/projects/:projectId/ai/weekly-report
export const weeklyReport = asyncHandler(async (req, res) => {
  const project = req.project;
  const milestoneDocs = await Milestone.find({ project: project._id }).sort({ dueDate: 1, createdAt: -1 });
  const taskDocs = await Task.find({ project: project._id }).sort({ updatedAt: -1 });
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentLog = project.activityLog.filter((a) => new Date(a.createdAt) >= oneWeekAgo);
  const userIds = [...new Set(recentLog.map((a) => a.user?.toString()).filter(Boolean))];
  const users = await User.find({ _id: { $in: userIds } }).select("name");
  const nameMap = Object.fromEntries(users.map((u) => [u._id.toString(), u.name]));

  const activitySummary = recentLog.length
    ? recentLog
        .map((a) => `${nameMap[a.user?.toString()] || "Someone"} — ${ACTION_LABELS[a.action] || a.action}${a.detail ? `: ${a.detail}` : ""}`)
        .join("\n")
    : "No activity this week.";

  const taskSummary = summarizeTasks(taskDocs);
  const milestoneSummary = summarizeMilestones(milestoneDocs);

  // The saved draft is reused unless the caller asks for a fresh one with ?refresh=true.
  if (project.weeklyUpdateDraft?.content && req.query.refresh !== "true") {
    return res.json({
      success: true,
      report: project.weeklyUpdateDraft.content,
      draft: project.weeklyUpdateDraft,
      fromCache: true,
    });
  }

  const report = await generatePlainLanguageWeeklyUpdate({
    projectName: project.name,
    milestoneSummary,
    taskSummary,
    activitySummary,
  });

  project.weeklyUpdateDraft = { content: report, generatedAt: new Date(), sentAt: project.weeklyUpdateDraft?.sentAt || null, sentBy: project.weeklyUpdateDraft?.sentBy || null };
  await project.save();
  res.json({ success: true, report, draft: project.weeklyUpdateDraft, fromCache: false });
});

// @route GET /api/projects/:projectId/ai/health
export const projectHealth = asyncHandler(async (req, res) => {
  const project = req.project;
  const [milestones, tasks, noteCount, fileCount] = await Promise.all([
    Milestone.find({ project: project._id }).select("status dueDate createdAt"),
    Task.find({ project: project._id }).select("status priority updatedAt createdAt"),
    Note.countDocuments({ project: project._id }),
    FileItem.countDocuments({ project: project._id }),
  ]);

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentActivity = project.activityLog.filter((a) => new Date(a.createdAt) >= oneWeekAgo).length;
  const lastActivityDate = project.activityLog.length ? project.activityLog[project.activityLog.length - 1].createdAt : project.createdAt;
  const daysSinceLastActivity = Math.floor((now - new Date(lastActivityDate)) / (1000 * 60 * 60 * 24));
  const overdueMilestones = milestones.filter((milestone) => milestone.status !== "approved" && milestone.dueDate && new Date(milestone.dueDate) < now).length;
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const taskProgress = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 100;
  const milestonesDueSoon = milestones.filter((milestone) => milestone.status !== "approved" && milestone.dueDate && new Date(milestone.dueDate) >= now && new Date(milestone.dueDate) <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)).length;

  let score = 100;
  score -= overdueMilestones * 25;
  score -= Math.max(0, 60 - taskProgress) * 0.5;
  if (daysSinceLastActivity > 14) score -= 20;
  else if (daysSinceLastActivity > 7) score -= 10;
  score -= milestonesDueSoon * 5;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const status = score >= 75 ? "healthy" : score >= 45 ? "slowing" : "inactive";
  const stats = {
    overdueMilestones,
    taskProgress,
    daysSinceLastActivity,
    recentActivity,
    noteCount,
    fileCount,
    milestonesDueSoon,
  };

  const cacheAgeMs = project.healthCache?.updatedAt ? now - new Date(project.healthCache.updatedAt) : Infinity;
  const cachedStats = JSON.stringify(project.healthCache?.stats || {});
  const currentStats = JSON.stringify(stats);
  if (cacheAgeMs < 60 * 60 * 1000 && project.healthCache?.status && cachedStats === currentStats) {
    return res.json({ success: true, stats, insight: { status: project.healthCache.status, reason: project.healthCache.reason, score: project.healthCache.score, cached: true } });
  }

  const reason = await generateHealthReason({ stats, status });
  project.healthCache = { status, score, reason, stats, updatedAt: new Date() };
  await project.save();

  res.json({ success: true, stats, insight: { status, reason, score, cached: false } });
});

// @route GET /api/projects/:projectId/ai/search?q=...
export const aiSearch = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    res.status(400);
    throw new Error("Search query must be at least 2 characters");
  }

  const queryEmbedding = await generateEmbedding(q);
  const [noteHits, fileHits, commentHits] = await Promise.all([
    loadVectorSearch({ model: Note, projectId: req.project._id, queryEmbedding, fields: ["title", "content", "embedding"], limit: 4 }),
    loadVectorSearch({ model: FileItem, projectId: req.project._id, queryEmbedding, fields: ["originalName", "textContent", "embedding"], limit: 4, titleField: "originalName" }),
    loadVectorSearch({ model: Comment, projectId: req.project._id, queryEmbedding, fields: ["content", "authorName", "embedding"], limit: 4, titleField: "content" }),
  ]);

  const sources = [
    ...noteHits.map((item) => ({
      id: item._id.toString(),
      type: "note",
      title: item.title,
      snippet: item.content.slice(0, 220),
      sourceRef: `Note: ${item.title}`,
    })),
    ...fileHits.map((item) => ({
      id: item._id.toString(),
      type: "file",
      title: item.originalName,
      snippet: item.textContent.slice(0, 220),
      sourceRef: `File: ${item.originalName}`,
    })),
    ...commentHits.map((item) => ({
      id: item._id.toString(),
      type: "comment",
      title: item.authorName || "Comment",
      snippet: item.content.slice(0, 220),
      sourceRef: `Comment by ${item.authorName || "Client"}`,
    })),
  ]
    .filter((item) => item.snippet && item.snippet.trim())
    .slice(0, 8);

  const answer = await answerWithSources({ question: q, sources, projectName: req.project.name });
  res.json({ success: true, answer: answer.answer, sources: answer.sources, results: sources });
});

// @route GET /api/projects/:projectId/ai/weekly-draft
export const getWeeklyUpdateDraft = asyncHandler(async (req, res) => {
  const project = req.project;
  const draft = project.weeklyUpdateDraft?.content || "";
  res.json({
    success: true,
    draft: {
      content: draft,
      generatedAt: project.weeklyUpdateDraft?.generatedAt || null,
      sentAt: project.weeklyUpdateDraft?.sentAt || null,
      sentBy: project.weeklyUpdateDraft?.sentBy || null,
    },
  });
});

// @route PATCH /api/projects/:projectId/ai/weekly-draft
export const saveWeeklyUpdateDraft = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    res.status(400);
    throw new Error("Weekly update content cannot be empty");
  }

  req.project.weeklyUpdateDraft = {
    content: content.trim(),
    generatedAt: req.project.weeklyUpdateDraft?.generatedAt || new Date(),
    sentAt: req.project.weeklyUpdateDraft?.sentAt || null,
    sentBy: req.project.weeklyUpdateDraft?.sentBy || null,
  };
  await req.project.save();
  res.json({ success: true, draft: req.project.weeklyUpdateDraft });
});

// @route POST /api/projects/:projectId/ai/weekly-draft/send
export const sendWeeklyUpdateDraft = asyncHandler(async (req, res) => {
  if (!req.project.clientEmail) {
    res.status(400);
    throw new Error("Invite a client email before sending the weekly update");
  }
  const draft = req.project.weeklyUpdateDraft?.content?.trim();
  if (!draft) {
    res.status(400);
    throw new Error("No weekly draft available to send");
  }

  const portalUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/client/${req.project._id}`;
  const { subject, html } = weeklyUpdateEmail({ projectName: req.project.name, report: draft, portalUrl });
  try {
    await sendEmail({ to: req.project.clientEmail, subject, html });
  } catch (error) {
    console.error("Weekly update email failed:", error.message);
    res.status(502);
    throw new Error("Couldn't send the email, so the update was not published. Please try again.");
  }

  // Publishing = copying the draft to publishedUpdate, which is the only thing the client portal shows.
  const sentAt = new Date();
  req.project.weeklyUpdateDraft.sentAt = sentAt;
  req.project.weeklyUpdateDraft.sentBy = req.user._id;
  req.project.publishedUpdate = { content: draft, sentAt };
  await req.project.save();
  res.json({ success: true, draft: req.project.weeklyUpdateDraft });
});

// @route POST /api/notes/:noteId/extract-tasks
export const extractTasksFromNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.noteId);
  if (!note) {
    res.status(404);
    throw new Error("Note not found");
  }
  const { project } = await loadProjectForUser(res, note.project, req.user, ["owner", "editor"]);

  const items = await extractActionItems(note.content);
  if (items.length === 0) {
    return res.json({ success: true, tasks: [], message: "No clear action items found in this note" });
  }

  const created = await Task.insertMany(
    items.map((item) => ({
      project: note.project,
      sourceNote: note._id,
      title: item.title,
      assigneeGuess: item.assigneeGuess || "",
      priority: TASK_PRIORITIES.includes(item.priority) ? item.priority : "medium",
      createdBy: "ai",
    }))
  );

  logActivity(project, req.user._id, "tasks_extracted", `${created.length} task(s) from "${note.title}"`);
  await project.save();

  res.status(201).json({ success: true, tasks: created });
});

// @route GET /api/projects/:projectId/tasks
export const getTasks = asyncHandler(async (req, res) => {
    const tasks = await Task.find({ project: req.project._id })
    .populate("assignee", "name email")
    .sort({ createdAt: -1 });
  res.json({ success: true, tasks });
});

// @route POST /api/projects/:projectId/tasks   body: { title, priority?, assigneeGuess? }
// @route GET /api/projects/:projectId/assignable-members
// Owner and editors can be assigned tasks. Used by the task composer's @mention picker.
export const getAssignableMembers = asyncHandler(async (req, res) => {
  const project = await req.project.populate([
    { path: "owner", select: "name email" },
    { path: "members.user", select: "name email" },
  ]);
  const people = [];
  const seen = new Set();
  const add = (user) => {
    if (!user || seen.has(String(user._id))) return;
    seen.add(String(user._id));
    people.push({ _id: user._id, name: user.name, email: user.email });
  };
  add(project.owner);
  for (const m of project.members) {
    if (["owner", "editor"].includes(m.role)) add(m.user);
  }
  res.json({ success: true, members: people });
});

// @route POST /api/projects/:projectId/tasks   body: { title, priority?, assigneeGuess?, assignee? }
export const createTask = asyncHandler(async (req, res) => {
  const { title, priority = "medium", assigneeGuess = "", assignee = null } = req.body;
  if (!TASK_PRIORITIES.includes(priority)) {
    res.status(400);
    throw new Error(`Priority must be one of: ${TASK_PRIORITIES.join(", ")}`);
  }

  // The assignee must be someone who can actually work on this project.
  let assigneeUser = null;
  if (assignee) {
    const ownerId = String(req.project.owner?._id || req.project.owner);
    const isMember = ownerId === String(assignee) || req.project.members.some((m) => String(m.user) === String(assignee) && ["owner", "editor"].includes(m.role));
    if (!isMember) {
      res.status(400);
      throw new Error("Tasks can only be assigned to owners or editors of this project");
    }
    assigneeUser = assignee;
  }

  const task = await Task.create({
    project: req.project._id,
    title,
    priority,
    assigneeGuess,
    assignee: assigneeUser,
    createdBy: "user",
  });
  logActivity(req.project, req.user._id, "task_created", `"${task.title}"${assigneeUser ? " (assigned)" : ""}`);
  await req.project.save();

  // Notify the assignee, unless they assigned it to themselves.
  if (assigneeUser && String(assigneeUser) !== String(req.user._id)) {
    await createNotification({
      recipientKey: `user:${assigneeUser}`,
      project: req.project._id,
      type: "task_assigned",
      title: `New task assigned to you`,
      message: `${req.user.name} assigned you "${task.title}" in ${req.project.name}`,
      metadata: { taskId: task._id, projectId: req.project._id },
    });
  }

  const populated = await task.populate("assignee", "name email");
  res.status(201).json({ success: true, task: populated });
});

// @route PATCH /api/tasks/:taskId   body: { status?, priority?, title? }
export const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.taskId);
  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }
  const { project } = await loadProjectForUser(res, task.project, req.user, ["owner", "editor"]);

  const { status, title, priority } = req.body;
  if (status !== undefined && !TASK_STATUSES.includes(status)) {
    res.status(400);
    throw new Error(`Status must be one of: ${TASK_STATUSES.join(", ")}`);
  }
  if (priority !== undefined && !TASK_PRIORITIES.includes(priority)) {
    res.status(400);
    throw new Error(`Priority must be one of: ${TASK_PRIORITIES.join(", ")}`);
  }

  const statusChanged = status !== undefined && status !== task.status;
  if (status !== undefined) task.status = status;
  if (title) task.title = title;
  if (priority !== undefined) task.priority = priority;
  await task.save();

  // Status changes feed the activity log, so they show up in the weekly report
  if (statusChanged) {
    logActivity(project, req.user._id, "task_status_changed", `"${task.title}" -> ${TASK_STATUS_LABELS[task.status]}`);
    await project.save();
  }
    await task.populate("assignee", "name email");

  res.json({ success: true, task });
});

// @route DELETE /api/tasks/:taskId
export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.taskId);
  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }
  await loadProjectForUser(res, task.project, req.user, ["owner", "editor"]);
  await task.deleteOne();
  res.json({ success: true, message: "Task deleted" });
});