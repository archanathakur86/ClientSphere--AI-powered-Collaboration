import asyncHandler from "express-async-handler";
import Project from "../models/Project.js";

export const loadClientProject = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "client") {
    res.status(403);
    throw new Error("Client access required");
  }

  const projectId = req.params.projectId || req.user.projectId;
  if (!projectId || projectId !== req.user.projectId) {
    res.status(404);
    throw new Error("Project not found");
  }

  const project = await Project.findById(projectId);
  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  req.project = project;
  next();
});
