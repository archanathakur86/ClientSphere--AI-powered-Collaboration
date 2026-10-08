import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import Project from "../models/Project.js";

// Loads the project named by :projectId, verifies the signed-in staff user is a
// member (owner or listed member), and attaches it as req.project for the
// downstream requireProjectRole() check and controllers.
//  - unknown / malformed id  -> 404
//  - not a member            -> 403 (the tests expect this)
export const loadProject = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;

  if (!mongoose.isValidObjectId(projectId)) {
    res.status(404);
    throw new Error("Project not found");
  }

  const project = await Project.findById(projectId);
  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  const uid = req.user._id.toString();
  const isMember =
    project.owner.toString() === uid || project.members.some((m) => m.user.toString() === uid);

  if (!isMember) {
    res.status(403);
    throw new Error("You do not have permission to access this project");
  }

  req.project = project;
  next();
});