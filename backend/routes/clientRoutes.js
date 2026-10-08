import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import ClientInvite from "../models/ClientInvite.js";
import Project from "../models/Project.js";
import { getClientPortalByToken } from "../controllers/projectController.js";
import { magicLinkLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Exchange a magic link for a client session.
//  - The link can be opened again until it expires or is revoked (email previews, a refresh,
//    or a second device must not "use it up").
//  - A project can have several invited clients: the token is matched against every
//    active invite of the project, not just the newest one.
router.get("/magic/:projectId/:token", magicLinkLimiter, async (req, res, next) => {
  try {
    const { projectId, token } = req.params;
    const invalid = () => {
      res.status(401);
      return new Error("This link is invalid or has expired. Ask your freelancer to send a new one.");
    };

    if (!mongoose.isValidObjectId(projectId) || !token) throw invalid();

    const invites = await ClientInvite.find({
      project: projectId,
      expiresAt: { $gt: new Date() },
      revokedAt: null,
    })
      .sort({ createdAt: -1 })
      .limit(20);

    let invite = null;
    for (const candidate of invites) {
      if (await bcrypt.compare(token, candidate.tokenHash)) {
        invite = candidate;
        break;
      }
    }
    if (!invite) throw invalid();

    const project = await Project.findById(projectId);
    if (!project) {
      res.status(404);
      throw new Error("Project not found");
    }

    // usedAt now means "first opened" (useful for the freelancer to see the invite was seen).
    if (!invite.usedAt) {
      invite.usedAt = new Date();
      await invite.save();
    }

    req.clientInvite = invite;
    req.project = project;
    return getClientPortalByToken(req, res, next);
  } catch (error) {
    next(error);
  }
});

export default router;