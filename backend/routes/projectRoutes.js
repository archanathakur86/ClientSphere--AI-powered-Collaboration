import express from "express";
import { protect, requireProjectRole } from "../middleware/auth.js";
import { loadProject } from "../middleware/project.js";
import upload from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import {
  createProjectSchema,
  updateProjectSchema,
  toggleProjectVisibilitySchema,
  addMemberSchema,
  inviteClientSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
  createNoteSchema,
  noteVisibilitySchema,
  fileVisibilitySchema,
  commentVisibilitySchema,
  addCommentSchema,
  weeklyDraftSchema,
  searchSchema,
  createTaskSchema,
} from "../utils/validationSchemas.js";
import { aiLimiter } from "../middleware/rateLimiter.js";
import {
  createProject,
  getMyProjects,
  getProject,
  addMember,
  removeMember,
  updateProject,
  toggleVisibility,
  getAnalytics,
  inviteClient,
  createMilestone,
  getMilestones,
  updateMilestone,
  deleteMilestone,
  listClientInvites,
  revokeClientInvite,
  suggestMembers,
} from "../controllers/projectController.js";
import { createNote, getNotes, toggleNoteVisibility } from "../controllers/noteController.js";
import { uploadFile, getFiles, toggleFileVisibility } from "../controllers/fileController.js";
import {
  generateProjectReadme,
  weeklyReport,
  projectHealth,
  aiSearch,
  getTasks,
  createTask,
  getAssignableMembers,
  getWeeklyUpdateDraft,
  saveWeeklyUpdateDraft,
  sendWeeklyUpdateDraft,
} from "../controllers/aiController.js";
import { getComments, addComment, toggleCommentVisibility,downloadCommentAttachment  } from "../controllers/commentController.js";

const router = express.Router();

router.use(protect);

router.route("/").post(validate(createProjectSchema), createProject).get(getMyProjects);

router
  .route("/:projectId")
  .get(loadProject, getProject)
  .patch(loadProject, requireProjectRole(["owner", "editor"]), validate(updateProjectSchema), updateProject);

router.patch("/:projectId/visibility", loadProject, validate(toggleProjectVisibilitySchema), toggleVisibility);
router.post("/:projectId/members", loadProject, validate(addMemberSchema), addMember);
router.get("/:projectId/member-suggestions", loadProject, suggestMembers);
router.delete("/:projectId/members/:userId", loadProject, removeMember);
router.get("/:projectId/analytics", loadProject, getAnalytics);
router.post("/:projectId/client-invite", loadProject, requireProjectRole(["owner"]), validate(inviteClientSchema), inviteClient);
router.get("/:projectId/client-invites", loadProject, requireProjectRole(["owner"]), listClientInvites);
router.patch("/:projectId/client-invite/:inviteId/revoke", loadProject, requireProjectRole(["owner"]), revokeClientInvite);
router
  .route("/:projectId/milestones")
  .get(loadProject, getMilestones)
  .post(loadProject, requireProjectRole(["owner", "editor"]), validate(createMilestoneSchema), createMilestone);
router.patch("/:projectId/milestones/:milestoneId", loadProject, requireProjectRole(["owner", "editor"]), validate(updateMilestoneSchema), updateMilestone);
router.delete("/:projectId/milestones/:milestoneId", loadProject, requireProjectRole(["owner", "editor"]), deleteMilestone);

// notes - only owner/editor can create; any member can view
router
  .route("/:projectId/notes")
  .post(loadProject, requireProjectRole(["owner", "editor"]), validate(createNoteSchema), createNote)
  .get(loadProject, getNotes);

// files - only owner/editor can upload; any member can view
router
  .route("/:projectId/files")
  .post(loadProject, requireProjectRole(["owner", "editor"]), upload.single("file"), uploadFile)
  .get(loadProject, getFiles);

// AI project-level features
router.post("/:projectId/ai/readme", aiLimiter, loadProject, generateProjectReadme);
router.get("/:projectId/ai/weekly-report", aiLimiter, loadProject, weeklyReport);
router.get("/:projectId/ai/weekly-draft", loadProject, getWeeklyUpdateDraft);
router.patch("/:projectId/ai/weekly-draft", loadProject, requireProjectRole(["owner", "editor"]), validate(weeklyDraftSchema), saveWeeklyUpdateDraft);
router.post("/:projectId/ai/weekly-draft/send", loadProject, requireProjectRole(["owner", "editor"]), sendWeeklyUpdateDraft);
router.get("/:projectId/ai/health", aiLimiter, loadProject, projectHealth);
router.get("/:projectId/ai/search", aiLimiter, loadProject, validate(searchSchema), aiSearch);
router.get("/:projectId/tasks", loadProject, getTasks);
router.post("/:projectId/tasks", loadProject, requireProjectRole(["owner", "editor"]), validate(createTaskSchema), createTask);
router.get("/:projectId/assignable-members", loadProject, getAssignableMembers);

// comments - open to any project member (owner/editor/viewer/commentor)
router.route("/:projectId/comments").get(loadProject, getComments).post(loadProject, validate(addCommentSchema), addComment);
router.get("/:projectId/comments/:commentId/attachments/:index", loadProject, downloadCommentAttachment);

// Register visibility endpoints for notes, comments, and files
router.patch("/:projectId/notes/:noteId/visibility", loadProject, requireProjectRole(["owner", "editor"]), validate(noteVisibilitySchema), toggleNoteVisibility);
router.patch("/:projectId/comments/:commentId/visibility", loadProject, requireProjectRole(["owner", "editor"]), validate(commentVisibilitySchema), toggleCommentVisibility);
router.patch("/:projectId/files/:fileId/visibility", loadProject, requireProjectRole(["owner", "editor"]), validate(fileVisibilitySchema), toggleFileVisibility);

export default router;