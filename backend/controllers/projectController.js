import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import Project from "../models/Project.js";
import User from "../models/User.js";
import Note from "../models/Note.js";
import FileItem from "../models/FileItem.js";
import Comment from "../models/Comment.js";
import Milestone from "../models/Milestone.js";
import Invoice from "../models/Invoice.js";
import ClientInvite from "../models/ClientInvite.js";
import Task from "../models/Task.js";
import { isValidMilestoneTransition } from "../middleware/projectAccess.js";
import { createProjectNotifications } from "../services/notificationService.js";
import { sendEmail } from "../services/emailService.js";
import {
  inviteEmail,
  milestoneDecisionEmail,
  milestoneSubmittedEmail,
} from "../services/emailTemplates.js";

const CLIENT_SESSION_SECONDS = 60 * 60 * 24 * 7; // a session lasts 7 days...
const CLIENT_INVITE_DAYS = 30; // ...and is renewed on every portal visit, until the invite expires

const createClientAccessToken = (project, invite) => {
  // Never outlive the invite itself.
  const secondsLeft = Math.floor((new Date(invite.expiresAt).getTime() - Date.now()) / 1000);
  const expiresIn = Math.max(60, Math.min(CLIENT_SESSION_SECONDS, secondsLeft));
  return jwt.sign(
    {
      id: `client:${project._id.toString()}`,
      role: "client",
      projectId: project._id.toString(),
      inviteId: invite._id.toString(),
      email: invite.email,
      name: project.clientName || invite.email,
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

const logActivity = (project, userId, action, detail = "") => {
  project.activityLog.push({ user: userId, action, detail, createdAt: new Date() });
  // cap log length to last 200 entries
  if (project.activityLog.length > 200) {
    project.activityLog = project.activityLog.slice(-200);
  }
};

// ---- Client portal projections --------------------------------------------
// The portal only ever receives these hand-picked fields. Never return raw
// documents to a client: they carry embeddings, AI reviews, scope-creep verdicts,
// raw storage URLs and other internal data.
const toPortalProject = (project) => ({
  _id: project._id,
  name: project.name,
  description: project.description,
  clientName: project.clientName,
  clientEmail: project.clientEmail,
  createdAt: project.createdAt,
});

const toPortalMilestone = (m) => ({
  _id: m._id,
  title: m.title,
  description: m.description,
  dueDate: m.dueDate,
  amount: m.amount,
  status: m.status,
  changeRequests: (m.changeRequests || []).map((c) => ({ comment: c.comment, createdAt: c.createdAt })),
  submittedAt: m.submittedAt,
  approvedAt: m.approvedAt,
});

const toPortalInvoice = (i) => ({
  _id: i._id,
  milestone: i.milestone,
  invoiceNumber: i.invoiceNumber,
  amount: i.amount,
  currency: i.currency,
  status: i.status,
  dueDate: i.dueDate,
  issueDate: i.issueDate,
  sentAt: i.sentAt,
  paidAt: i.paidAt,
});

const toPortalNote = (n) => ({
  _id: n._id,
  title: n.title,
  content: n.content,
  tags: n.tags,
  createdAt: n.createdAt,
  updatedAt: n.updatedAt,
  author: n.author ? { name: n.author.name } : null,
});

const toPortalFile = (f) => ({
  _id: f._id,
  originalName: f.originalName,
  fileType: f.fileType,
  version: f.version,
  createdAt: f.createdAt,
  uploader: f.uploader ? { name: f.uploader.name } : null,
});

const toPortalComment = (c) => ({
  _id: c._id,
  content: c.content,
  authorName: c.authorName || c.author?.name || "",
  author: c.author ? { name: c.author.name } : null,
  fromClient: !c.author,
  createdAt: c.createdAt,
});

const buildPortalPayload = async (project) => {
  const [notes, comments, files, milestones, invoices] = await Promise.all([
    Note.find({ project: project._id, isShared: true }).select("-embedding").populate("author", "name").sort({ createdAt: -1 }),
    Comment.find({ project: project._id, isShared: true }).select("-embedding").populate("author", "name").sort({ createdAt: 1 }),
    FileItem.find({ project: project._id, isShared: true }).select("-embedding -textContent -review").populate("uploader", "name").sort({ createdAt: -1 }),
    Milestone.find({ project: project._id }).sort({ dueDate: 1, createdAt: -1 }),
    // Draft invoices are the freelancer's private work-in-progress.
    Invoice.find({ project: project._id, status: { $ne: "draft" } }).sort({ createdAt: -1 }),
  ]);

  // Only an update the freelancer explicitly sent. Drafts are never exposed.
  const published = project.publishedUpdate?.sentAt ? project.publishedUpdate.content || "" : "";

  return {
    project: toPortalProject(project),
    milestones: milestones.map(toPortalMilestone),
    invoices: invoices.map(toPortalInvoice),
    notes: notes.map(toPortalNote),
    comments: comments.map(toPortalComment),
    files: files.map(toPortalFile),
    weeklyUpdate: published,
    weeklyUpdateSentAt: project.publishedUpdate?.sentAt || null,
    progress:
      milestones.length > 0
        ? Math.round((milestones.filter((m) => m.status === "approved").length / milestones.length) * 100)
        : 0,
  };
};

// @route POST /api/projects
export const createProject = asyncHandler(async (req, res) => {
  const { name, description, clientName, clientEmail } = req.body;
  if (!name) {
    res.status(400);
    throw new Error("Project name is required");
  }

  const project = await Project.create({
    name,
    description: description || "",
    clientName: clientName || "",
    clientEmail: clientEmail || "",
    owner: req.user._id,
    members: [],
  });

  res.status(201).json({ success: true, project });
});

// @route GET /api/projects  (all projects current user is part of)
// Each project carries a small live summary for the dashboard cards, and the response has
// workspace totals. Money (invoices) is only counted for projects where the user is owner/editor.
export const getMyProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({
    $or: [{ owner: req.user._id }, { "members.user": req.user._id }],
  })
    .select("-activityLog -readme -weeklyUpdateDraft -publishedUpdate")
    .sort({ updatedAt: -1 })
    .populate("owner", "name email avatar");

  const ids = projects.map((p) => p._id);
  const now = new Date();
  const scopeWindow = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // `owner` is populated here, so compare ids explicitly (getUserRole expects a raw ObjectId).
  const me = req.user._id.toString();
  const roleIn = (p) => {
    if ((p.owner?._id || p.owner).toString() === me) return "owner";
    return p.members.find((m) => m.user.toString() === me)?.role || null;
  };
  const canSeeMoney = new Set(projects.filter((p) => ["owner", "editor"].includes(roleIn(p))).map((p) => p._id.toString()));

  const [milestones, invoices, scopeAlerts] = ids.length
    ? await Promise.all([
        Milestone.find({ project: { $in: ids } }).select("project status dueDate title"),
        Invoice.find({ project: { $in: [...canSeeMoney] }, status: { $in: ["sent", "overdue"] } }).select("project status amount"),
        Comment.aggregate([
          {
            $match: {
              project: { $in: [...canSeeMoney].map((id) => new mongoose.Types.ObjectId(id)) },
              author: null,
              scopeVerdict: "out of scope",
              createdAt: { $gte: scopeWindow },
            },
          },
          { $group: { _id: "$project", count: { $sum: 1 } } },
        ]),
      ])
    : [[], [], []];

  const by = (list) =>
    list.reduce((acc, item) => {
      const key = item.project.toString();
      (acc[key] = acc[key] || []).push(item);
      return acc;
    }, {});
  const milestonesByProject = by(milestones);
  const invoicesByProject = by(invoices);
  const scopeByProject = Object.fromEntries(scopeAlerts.map((s) => [s._id.toString(), s.count]));

  const withSummary = projects.map((project) => {
    const key = project._id.toString();
    const ms = milestonesByProject[key] || [];
    const open = ms.filter((m) => m.status !== "approved" && m.dueDate);
    const upcoming = open.filter((m) => new Date(m.dueDate) >= now).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
    const overdueMilestones = open.filter((m) => new Date(m.dueDate) < now);
    const inv = invoicesByProject[key] || [];

    return {
      ...project.toObject(),
      summary: {
        milestonesTotal: ms.length,
        milestonesApproved: ms.filter((m) => m.status === "approved").length,
        pendingApprovals: ms.filter((m) => m.status === "in review").length,
        changesRequested: ms.filter((m) => m.status === "changes requested").length,
        nextDeadline: upcoming ? { title: upcoming.title, dueDate: upcoming.dueDate } : null,
        overdueMilestones: overdueMilestones.length,
        overdueInvoices: inv.filter((i) => i.status === "overdue").length,
        unpaidInvoices: inv.length,
        scopeAlerts: scopeByProject[key] || 0,
      },
    };
  });

  const sum = (field) => withSummary.reduce((total, p) => total + p.summary[field], 0);
  res.json({
    success: true,
    projects: withSummary,
    summary: {
      activeProjects: withSummary.length,
      pendingApprovals: sum("pendingApprovals"),
      overdueInvoices: sum("overdueInvoices"),
      overdueMilestones: sum("overdueMilestones"),
      scopeAlerts: sum("scopeAlerts"),
    },
  });
});

// @route GET /api/projects/:projectId
export const getProject = asyncHandler(async (req, res) => {
  const project = await req.project.populate([
    { path: "owner", select: "name email avatar" },
    { path: "members.user", select: "name email avatar" },
  ]);
  res.json({ success: true, project });
});

// @route POST /api/projects/:projectId/members
export const addMember = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const project = req.project;

  if (project.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the project owner can add members");
  }

  const userToAdd = await User.findOne({ email: email?.toLowerCase() });
  if (!userToAdd) {
    res.status(404);
    throw new Error("No user found with that email");
  }

  const alreadyMember = project.members.some((m) => m.user.toString() === userToAdd._id.toString());
  if (alreadyMember) {
    res.status(400);
    throw new Error("User is already a member of this project");
  }

  project.members.push({ user: userToAdd._id, role: role || "editor" });
  logActivity(project, req.user._id, "member_added", `${userToAdd.name} added as ${role || "editor"}`);
  await project.save();

  res.json({ success: true, project });
});

// @route DELETE /api/projects/:projectId/members/:userId
export const removeMember = asyncHandler(async (req, res) => {
  const project = req.project;
  if (project.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the project owner can remove members");
  }
  project.members = project.members.filter((m) => m.user.toString() !== req.params.userId);
  logActivity(project, req.user._id, "member_removed");
  await project.save();
  res.json({ success: true, project });
});

// @route PATCH /api/projects/:projectId
export const updateProject = asyncHandler(async (req, res) => {
  const project = req.project;
  const { name, description, readme } = req.body;
  if (name) project.name = name;
  if (description !== undefined) project.description = description;
  if (readme !== undefined) project.readme = readme;
  await project.save();
  res.json({ success: true, project });
});

// @route PATCH /api/projects/:projectId/visibility
export const toggleVisibility = asyncHandler(async (req, res) => {
  const project = req.project;
  if (project.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the project owner can change visibility");
  }
  project.isPublic = !project.isPublic;
  await project.save();
  res.json({ success: true, isPublic: project.isPublic, publicSlug: project.publicSlug });
});

// @route GET /api/public/:slug  (no auth)
export const getPublicProject = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ publicSlug: req.params.slug, isPublic: true }).populate(
    "owner",
    "name avatar"
  );
  if (!project) {
    res.status(404);
    throw new Error("Public project not found or not shared");
  }
  const notes = await Note.find({ project: project._id, isShared: true }).select("title content tags createdAt");
  res.json({
    success: true,
    project: {
      name: project.name,
      description: project.description,
      readme: project.readme,
      owner: project.owner,
      createdAt: project.createdAt,
    },
    notes,
  });
});

// @route GET /api/projects/:projectId/analytics
export const getAnalytics = asyncHandler(async (req, res) => {
  const project = req.project;
  const projectId = project._id;

  const [noteCounts, fileCounts] = await Promise.all([
    Note.aggregate([{ $match: { project: projectId } }, { $group: { _id: "$author", count: { $sum: 1 } } }]),
    FileItem.aggregate([{ $match: { project: projectId } }, { $group: { _id: "$uploader", count: { $sum: 1 } } }]),
  ]);

  const memberIds = [project.owner, ...project.members.map((m) => m.user)];
  const users = await User.find({ _id: { $in: memberIds } }).select("name email avatar");

  const contribution = users.map((u) => {
    const notes = noteCounts.find((n) => n._id?.toString() === u._id.toString())?.count || 0;
    const files = fileCounts.find((f) => f._id?.toString() === u._id.toString())?.count || 0;
    return { user: { _id: u._id, name: u.name, avatar: u.avatar }, notes, files, total: notes + files };
  });

  res.json({
    success: true,
    contribution,
    totals: {
      notes: noteCounts.reduce((a, b) => a + b.count, 0),
      files: fileCounts.reduce((a, b) => a + b.count, 0),
    },
    recentActivity: project.activityLog.slice(-20).reverse(),
  });
});

// @route POST /api/projects/:projectId/invite
export const inviteClient = asyncHandler(async (req, res) => {
  const { email, clientName } = req.body;
  const project = req.project;
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    res.status(400);
    throw new Error("Client email is required");
  }

  const rawToken = crypto.randomBytes(24).toString("hex");
  const tokenHash = await bcrypt.hash(rawToken, 10);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * CLIENT_INVITE_DAYS);

  project.clientEmail = normalizedEmail;
  project.clientName = clientName?.trim() || project.clientName || "Client";

  const invite = await ClientInvite.findOneAndUpdate(
    { project: project._id, email: normalizedEmail },
    {
      project: project._id,
      email: normalizedEmail,
      invitedBy: req.user._id,
      tokenHash,
      expiresAt,
      revokedAt: null,
      usedAt: null,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await project.save();

  const frontendOrigin = process.env.CLIENT_URL || "http://localhost:5173";
  const magicLink = `${frontendOrigin}/client/${project._id}/${rawToken}`;
  const canSendEmail = process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS;
  let emailSent = false;
  if (!canSendEmail) {
    console.log(`[Client invite] ${magicLink}`);
  } else {
    const { subject, html } = inviteEmail({
      projectName: project.name,
      magicLink,
      clientName: project.clientName || normalizedEmail,
      freelancerName: req.user.name,
    });
    try {
      await sendEmail({ to: normalizedEmail, subject, html });
      emailSent = true;
    } catch (error) {
      // The invite exists either way: the freelancer can copy the link and send it themselves.
      console.error("Invite email failed:", error.message);
    }
  }

  res.json({
    success: true,
    invite: {
      _id: invite._id,
      email: normalizedEmail,
      expiresAt,
      revoked: false,
    },
    emailSent,
    magicLink,
  });
});

// @route GET /api/projects/:projectId/client-portal
export const getClientPortal = asyncHandler(async (req, res) => {
  const { project } = req;
  const payload = await buildPortalPayload(project);
  res.json({ success: true, ...payload });
});

// @route GET /api/client-portal
export const getClientPortalByToken = asyncHandler(async (req, res) => {
  const project = req.project || (req.clientInvite ? await Project.findById(req.clientInvite.project) : null);
  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  if (req.clientInvite) {
    req.project = project;
  }
  const payload = await buildPortalPayload(project);

  // Always hand back a fresh session token: first visit via the magic link, and on every
  // later visit (this keeps an active client signed in without ever re-sending the link).
  let invite = req.clientInvite || null;
  if (!invite && req.user?.role === "client" && req.user.inviteId) {
    invite = await ClientInvite.findById(req.user.inviteId);
  }
  const clientAccessToken = invite ? createClientAccessToken(project, invite) : "";
  res.json({ success: true, clientAccessToken, ...payload });
});

const parseOptionalDate = (res, value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    res.status(400);
    throw new Error("Invalid date");
  }
  return date;
};

const parseAmount = (res, value) => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount < 0) {
    res.status(400);
    throw new Error("Amount must be a number of 0 or more");
  }
  return amount;
};

// Emails must never break the action that triggered them.
const safeSendEmail = async (payload) => {
  try {
    await sendEmail(payload);
  } catch (error) {
    console.error("Email send failed:", error.message);
  }
};

// @route POST /api/projects/:projectId/milestones
export const createMilestone = asyncHandler(async (req, res) => {
  const { title, description, dueDate, amount } = req.body;
  if (!title || !title.trim()) {
    res.status(400);
    throw new Error("Milestone title is required");
  }

  const milestone = await Milestone.create({
    project: req.project._id,
    title: title.trim(),
    description: description || "",
    dueDate: parseOptionalDate(res, dueDate),
    amount: parseAmount(res, amount),
    status: "pending",
  });

  logActivity(req.project, req.user._id, "milestone_created", `${milestone.title}`);
  await req.project.save();

  res.status(201).json({ success: true, milestone });
});

// @route GET /api/projects/:projectId/milestones
export const getMilestones = asyncHandler(async (req, res) => {
  const milestones = await Milestone.find({ project: req.project._id }).sort({ dueDate: 1, createdAt: -1 });
  res.json({ success: true, milestones });
});

// Single place where a milestone changes. Used by the freelancer PATCH route and by
// the client approve / request-changes routes, so the rules cannot drift apart:
//  - the client can ONLY change status (their body is never used for title/amount/etc.)
//  - the client can only act while the milestone is "in review"
//  - staff cannot approve or request changes on the client's behalf
//  - the change is one atomic update guarded by the current status (no double-approve)
const applyMilestoneUpdate = async (req, res, milestoneId, input, actor) => {
  const project = req.project;
  const isClient = actor === "client";

  const milestone = await Milestone.findOne({ _id: milestoneId, project: project._id });
  if (!milestone) {
    res.status(404);
    throw new Error("Milestone not found");
  }

  const { title, description, dueDate, amount, status } = input;
  const note = String(input.comment || input.reason || "").trim();
  const set = {};
  const push = {};

  // 1) Field edits: staff only, and only before submission / after changes were requested.
  const wantsFieldEdit = [title, description, dueDate, amount].some((v) => v !== undefined);
  if (wantsFieldEdit && !isClient) {
    if (!["pending", "changes requested"].includes(milestone.status)) {
      res.status(400);
      throw new Error("Milestone details are locked while it is in review or after it is approved");
    }
    if (title !== undefined) set.title = title.trim();
    if (description !== undefined) set.description = description;
    if (dueDate !== undefined) set.dueDate = parseOptionalDate(res, dueDate);
    if (amount !== undefined) set.amount = parseAmount(res, amount);
  }

  // 2) Status change
  let nextStatus = null;
  const statusRequested = status !== undefined && (isClient || status !== milestone.status);
  if (statusRequested) {
    if (!isClient && ["approved", "changes requested"].includes(status)) {
      res.status(403);
      throw new Error("Only the client can approve a milestone or request changes");
    }
    if (!isValidMilestoneTransition(milestone.status, status, actor)) {
      res.status(400);
      throw new Error(
        isClient
          ? "This milestone is not waiting for your review"
          : `Invalid milestone status transition from ${milestone.status} to ${status}`
      );
    }
    if (status === "changes requested" && !note) {
      res.status(400);
      throw new Error("A change request comment is required");
    }

    nextStatus = status;
    set.status = status;
    if (status === "in review") set.submittedAt = new Date();
    if (status === "approved") set.approvedAt = new Date();
    if (status === "changes requested") push.changeRequests = { comment: note, createdAt: new Date() };
  }

  if (Object.keys(set).length === 0) return milestone;

  const update = { $set: set };
  if (Object.keys(push).length) update.$push = push;

  const updated = await Milestone.findOneAndUpdate(
    { _id: milestone._id, project: project._id, status: milestone.status },
    update,
    { new: true, runValidators: true }
  );
  if (!updated) {
    res.status(409);
    throw new Error("This milestone was just updated by someone else. Refresh and try again.");
  }

  const recipients = [`user:${project.owner.toString()}`, `client:${project._id.toString()}`];
  const portalUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/client/${project._id}`;

  if (nextStatus === "changes requested") {
    await Task.create({
      project: project._id,
      title: `change request: ${updated.title}`,
      status: "todo",
      priority: "high",
      createdBy: "user",
    });
    await createProjectNotifications(
      project,
      "milestone_changes_requested",
      `Changes requested for ${updated.title}`,
      note,
      { milestoneId: updated._id.toString() },
      recipients
    );
  }

  if (nextStatus === "in review") {
    await createProjectNotifications(
      project,
      "milestone_submitted",
      `${updated.title} submitted for review`,
      updated.description || "A milestone is ready for review.",
      { milestoneId: updated._id.toString() },
      recipients
    );
    if (project.clientEmail) {
      const { subject, html } = milestoneSubmittedEmail({ projectName: project.name, milestoneTitle: updated.title, portalUrl });
      await safeSendEmail({ to: project.clientEmail, subject, html });
    }
  }

  if (nextStatus === "approved") {
    let invoice;
    try {
      invoice = await Invoice.create({
        project: project._id,
        milestone: updated._id,
        clientEmail: project.clientEmail || req.user.email || "",
        invoiceNumber: `INV-${Date.now()}`,
        amount: Number(updated.amount || 0),
        status: "draft",
        dueDate: updated.dueDate,
      });
    } catch (error) {
      // Don't leave an approved milestone with no invoice: put it back in review.
      await Milestone.updateOne({ _id: updated._id, status: "approved" }, { $set: { status: "in review", approvedAt: null } });
      throw error;
    }
    updated.invoice = invoice._id;
    await updated.save();

    await createProjectNotifications(
      project,
      "milestone_approved",
      `${updated.title} approved`,
      `Draft invoice ${invoice.invoiceNumber} created.`,
      { milestoneId: updated._id.toString(), invoiceId: invoice._id.toString() },
      recipients
    );
    if (project.clientEmail) {
      const { subject, html } = milestoneDecisionEmail({
        projectName: project.name,
        milestoneTitle: updated.title,
        decision: "approved",
        portalUrl,
      });
      await safeSendEmail({ to: project.clientEmail, subject, html });
    }
  }

  // Clients have no User document, so they cannot be stored as the activity "user".
  const actorId = isClient ? null : req.user._id;
  const label = isClient ? "Client: " : "";
  logActivity(project, actorId, "milestone_updated", `${label}${updated.title} -> ${updated.status}`);
  await project.save();

  return updated;
};

// @route PATCH /api/projects/:projectId/milestones/:milestoneId   (owner/editor)
export const updateMilestone = asyncHandler(async (req, res) => {
  const milestone = await applyMilestoneUpdate(req, res, req.params.milestoneId, req.body, "staff");
  res.json({ success: true, milestone });
});

// @route POST /api/client/projects/:projectId/milestones/:milestoneId/approve
// Note: the request body is deliberately ignored.
export const approveMilestoneForClient = asyncHandler(async (req, res) => {
  const existing = await Milestone.findOne({ _id: req.params.milestoneId, project: req.project._id });
  if (!existing) {
    res.status(404);
    throw new Error("Milestone not found");
  }
  if (existing.status === "approved") {
    return res.json({ success: true, milestone: toPortalMilestone(existing), message: "Milestone already approved" });
  }
  const milestone = await applyMilestoneUpdate(req, res, req.params.milestoneId, { status: "approved" }, "client");
  res.json({ success: true, milestone: toPortalMilestone(milestone) });
});

// @route POST /api/client/projects/:projectId/milestones/:milestoneId/request-changes
export const requestChangesForClient = asyncHandler(async (req, res) => {
  const comment = String(req.body?.comment || "").trim();
  if (!comment) {
    res.status(400);
    throw new Error("A change request comment is required");
  }
  const milestone = await applyMilestoneUpdate(
    req,
    res,
    req.params.milestoneId,
    { status: "changes requested", comment },
    "client"
  );
  res.json({ success: true, milestone: toPortalMilestone(milestone) });
});

// @route DELETE /api/projects/:projectId/milestones/:milestoneId   (owner/editor)
// Only milestones the client hasn't acted on can go: approved ones are final (they have an
// invoice), and one that is in review must be withdrawn first.
export const deleteMilestone = asyncHandler(async (req, res) => {
  const deleted = await Milestone.findOneAndDelete({
    _id: req.params.milestoneId,
    project: req.project._id,
    status: { $in: ["pending", "changes requested"] },
  });
  if (!deleted) {
    const existing = await Milestone.findOne({ _id: req.params.milestoneId, project: req.project._id });
    if (!existing) {
      res.status(404);
      throw new Error("Milestone not found");
    }
    res.status(400);
    throw new Error(
      existing.status === "approved"
        ? "Approved milestones can't be deleted"
        : "Withdraw this milestone from review before deleting it"
    );
  }
  logActivity(req.project, req.user._id, "milestone_deleted", deleted.title);
  await req.project.save();
  res.json({ success: true });
});

// @route GET /api/projects/:projectId/client-invites   (owner)
// Never returns the token hash.
export const listClientInvites = asyncHandler(async (req, res) => {
  const invites = await ClientInvite.find({ project: req.project._id }).sort({ createdAt: -1 });
  const now = new Date();
  res.json({
    success: true,
    invites: invites.map((invite) => ({
      _id: invite._id,
      email: invite.email,
      createdAt: invite.createdAt,
      usedAt: invite.usedAt,
      expiresAt: invite.expiresAt,
      revokedAt: invite.revokedAt,
      // invited = link sent, never opened; active = opened and still valid
      status: invite.revokedAt ? "revoked" : invite.expiresAt <= now ? "expired" : invite.usedAt ? "active" : "invited",
    })),
  });
});

export const revokeClientInvite = asyncHandler(async (req, res) => {
  const { inviteId } = req.params;
  const invite = await ClientInvite.findById(inviteId);
  if (!invite) {
    res.status(404);
    throw new Error("Client invite not found");
  }
  if (invite.project.toString() !== req.project._id.toString()) {
    res.status(404);
    throw new Error("Client invite not found in this project");
  }

  invite.revokedAt = new Date();
  await invite.save();
  res.json({ success: true, revoked: true, invite });
});

export { logActivity };