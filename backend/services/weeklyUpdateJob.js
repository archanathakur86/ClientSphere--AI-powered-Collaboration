import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Milestone from "../models/Milestone.js";
import { generatePlainLanguageWeeklyUpdate } from "./groqService.js";
import { createProjectNotifications } from "./notificationService.js";

const isoDate = (d) => new Date(d).toISOString().slice(0, 10);

export const sendWeeklyClientUpdates = async () => {
  const projects = await Project.find({ clientEmail: { $ne: "" } }).populate("owner", "email name");
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const project of projects) {
    try {
      const recentLog = project.activityLog.filter((a) => new Date(a.createdAt) >= oneWeekAgo);
      const activityText = recentLog.map((a) => `${a.action}: ${a.detail || "update"}`).join("\n") || "No activity this week.";
      const tasks = await Task.find({ project: project._id }).limit(200);
      const milestones = await Milestone.find({ project: project._id }).limit(200);
      const taskSummary = tasks.length
        ? `${tasks.length} tasks total; ${tasks.filter((t) => t.status === "done").length} done, ${tasks.filter((t) => t.status === "in-progress").length} in progress, ${tasks.filter((t) => t.status === "todo").length} to do.`
        : "No tasks yet.";

      const draft = await generatePlainLanguageWeeklyUpdate({
        projectName: project.name,
        milestoneSummary: milestones.length ? milestones.map((milestone) => `${milestone.title} — ${milestone.status}`).join("\n") : "No milestones yet.",
        taskSummary,
        activitySummary: activityText,
      });

      project.weeklyUpdateDraft = {
        content: draft,
        generatedAt: now,
        sentAt: null,
        sentBy: null,
      };
      await project.save();

      await createProjectNotifications(
        project,
        "milestone_submitted",
        `${project.name} weekly update draft ready`,
        "A fresh weekly draft was generated for editing.",
        { projectId: project._id.toString(), draft: true },
        [`user:${project.owner._id.toString()}`]
      );
    } catch (error) {
      console.error(`Weekly update draft failed for project ${project._id}:`, error.message);
    }
  }
};
