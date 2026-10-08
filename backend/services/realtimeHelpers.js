import Project from "../models/Project.js";

export const getProjectRecipientKeys = async (projectId) => {
  const project = await Project.findById(projectId).select("owner clientEmail members");
  if (!project) return [];
  const recipients = [`user:${project.owner.toString()}`];
  if (project.clientEmail) recipients.push(`client:${project._id.toString()}`);
  return recipients;
};
