import Project from "../models/Project.js";

// "owner" | "editor" | "viewer" | "commentor" | null (not a member)
export const getUserRole = (project, userId) => {
  const uid = userId.toString();
  if (project.owner.toString() === uid) return "owner";
  const member = project.members.find((m) => m.user.toString() === uid);
  return member ? member.role : null;
};

// Loads a project and verifies the user belongs to it (optionally with one of
// `allowedRoles`). Follows the codebase convention: set res.status, then throw.
// Needed by routes that only have a fileId/taskId/noteId and therefore don't
// go through the loadProject middleware.
export const loadProjectForUser = async (res, projectId, user, allowedRoles = null) => {
  const project = await Project.findById(projectId);
  if (!project) {
    res.status(404);
    throw new Error("Resource not found");
  }
  const role = getUserRole(project, user._id);
  if (!role) {
    res.status(404);
    throw new Error("Resource not found");
  }
  if (allowedRoles && !allowedRoles.includes(role)) {
    res.status(403);
    throw new Error("You do not have permission to perform this action");
  }
  return { project, role };
};

export const MILESTONE_STATUSES = ["pending", "in review", "changes requested", "approved"];

// Who may move a milestone where:
//  - staff (owner/editor) submit work for review, or pull it back;
//  - only the client can approve or request changes, and only while it is "in review".
// "approved" is final, so an approved milestone can't be re-opened and re-invoiced.
const MILESTONE_TRANSITIONS = {
  staff: {
    pending: ["in review"],
    "in review": ["pending"],
    "changes requested": ["in review", "pending"],
    approved: [],
  },
  client: {
    "in review": ["approved", "changes requested"],
  },
};

export const isValidMilestoneTransition = (from, to, actor = "staff") =>
  Boolean(MILESTONE_TRANSITIONS[actor]?.[from]?.includes(to));

export const filterVisibleProjectContent = (req, { notes = [], comments = [], files = [] } = {}) => {
  const isClient = req.user && req.user.role === "client";
  if (!isClient) return { notes, comments, files };

  return {
    notes: notes.filter((note) => note.isShared),
    comments: comments.filter((comment) => comment.isShared),
    files: files.filter((file) => file.isShared),
  };
};