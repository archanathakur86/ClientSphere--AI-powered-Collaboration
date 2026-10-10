import asyncHandler from "express-async-handler";
import Comment from "../models/Comment.js";
import Milestone from "../models/Milestone.js";
import { loadProjectForUser, getUserRole } from "../middleware/projectAccess.js";
import { createProjectNotifications } from "../services/notificationService.js";
import { fetchStoredFile, contentTypeFor, uploadBufferToCloudinary, getExtension } from "../services/uploadService.js";
import { detectScopeCreep, generateEmbedding } from "../services/groqService.js";

// @route GET /api/projects/:projectId/comments
export const getComments = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ project: req.project._id })
    .select("-embedding")
    .populate("author", "name avatar")
    .sort({ createdAt: 1 });
  res.json({ success: true, comments });
});

// @route POST /api/projects/:projectId/comments
export const addComment = asyncHandler(async (req, res) => {
    const commentText = String(req.body.content || "").trim();
  if (!commentText && !req.file) {
    res.status(400);
    throw new Error("Write a message or attach a file");
  }

  const isClient = req.user?.role === "client";

  // Optional attachment (e.g. a screenshot the client wants the team to see).
  let attachments = [];
  if (req.file) {
    try {
      const uploaded = await uploadBufferToCloudinary(req.file.buffer, `clientsphere/${req.project._id}/messages`);
      attachments = [
        {
          originalName: req.file.originalname,
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          fileType: getExtension(req.file.originalname),
          size: req.file.size,
        },
      ];
    } catch (err) {
      res.status(502);
      throw new Error("Attachment upload failed. Please try again.");
    }
  }

  // Compare the client's request with the project's real milestones (they live in their
  // own collection, not on the project document).
  let scopeCheck = null;
  if (isClient) {
    const milestones = await Milestone.find({ project: req.project._id }).select("title description");
    scopeCheck = await detectScopeCreep({
      comment: commentText,
      milestoneDescriptions: milestones.map((m) => `${m.title}: ${m.description || ""}`),
      taskTitles: [],
    }).catch(() => null);
  }

  const comment = await Comment.create({
    project: req.project._id,
    author: isClient ? null : req.user._id,
    authorName: isClient ? req.user.name || req.project.clientName || "Client" : req.user.name,
    authorEmail: req.user.email || "",
    content: commentText,
        attachments,
    // A client's own comment must be visible to them. Staff comments start internal;
    // only owners/editors can publish one to the client (viewers/commentors cannot).
    isShared: isClient ? true : Boolean(req.body.isShared) && ["owner", "editor"].includes(getUserRole(req.project, req.user._id)),
    embedding: await generateEmbedding(commentText).catch(() => []),
    scopeVerdict: scopeCheck?.verdict || "",
    scopeReason: scopeCheck?.reason || "",
    scopeSuggestedReply: scopeCheck?.suggestedReply || "",
  });

  // Who hears about it: the freelancer when a client writes; the client only when a
  // staff comment has been shared. Internal discussion never reaches the client.
  const recipients = isClient ? [`user:${req.project.owner.toString()}`] : comment.isShared ? [`client:${req.project._id.toString()}`] : [];
  await createProjectNotifications(
    req.project,
    "new_comment",
    `New comment on ${req.project.name}`,
    commentText,
    { commentId: comment._id.toString(), ...(isClient ? { scopeVerdict: scopeCheck?.verdict || "" } : {}) },
    recipients
  );

  // The scope-creep verdict and suggested reply are for the freelancer only.
  if (isClient) {
    return res.status(201).json({
      success: true,
            comment: {
        _id: comment._id,
        content: comment.content,
        authorName: comment.authorName,
        fromClient: true,
        createdAt: comment.createdAt,
        attachments: comment.attachments.map((a, index) => ({ index, originalName: a.originalName, fileType: a.fileType, size: a.size })),
      },
    });
  }
  const populated = await comment.populate("author", "name avatar");
  res.status(201).json({ success: true, comment: populated });
});

// @route DELETE /api/comments/:commentId  (author or project owner only)
export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) {
    res.status(404);
    throw new Error("Comment not found");
  }
  const { project } = await loadProjectForUser(res, comment.project, req.user);
  // Client comments have no author document, so only the owner can remove those.
  const isAuthor = Boolean(comment.author) && comment.author.toString() === req.user._id.toString();
  const isOwner = project.owner.toString() === req.user._id.toString();
  if (!isAuthor && !isOwner) {
    res.status(403);
    throw new Error("You do not have permission to delete this comment");
  }
  await comment.deleteOne();
  res.json({ success: true, message: "Comment deleted" });
});

// @route PATCH /api/comments/:commentId/visibility
export const toggleCommentVisibility = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) {
    res.status(404);
    throw new Error("Comment not found");
  }
  const { project } = await loadProjectForUser(res, comment.project, req.user, ["owner", "editor"]);

  const { isShared } = req.body;
  comment.isShared = Boolean(isShared);
  await comment.save();
  res.json({ success: true, comment, project });
});

// @route GET /api/projects/:projectId/comments/:commentId/attachments/:index
// Team members and the client (for shared messages) download attachments through the API.
export const downloadCommentAttachment = asyncHandler(async (req, res) => {
  const comment = await Comment.findOne({ _id: req.params.commentId, project: req.project._id });
  const attachment = comment?.attachments?.[Number(req.params.index)];
  const clientBlocked = req.user?.role === "client" && !comment?.isShared;
  if (!attachment || clientBlocked) {
    res.status(404);
    throw new Error("Attachment not found");
  }
  let buffer;
  try {
    buffer = await fetchStoredFile(attachment);
  } catch (err) {
    res.status(502);
    throw new Error("Couldn't read this attachment from storage");
  }
  res.set({
    "Content-Type": contentTypeFor(attachment.fileType),
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
  });
  res.send(buffer);
});