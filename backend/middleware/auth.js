import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import ClientInvite from "../models/ClientInvite.js";

const getBearerToken = (req) => {
  const header = req.headers.authorization;
  return header && header.startsWith("Bearer ") ? header.split(" ")[1] : null;
};

// Verifies the JWT and fills req.user.
//  - staff token  -> { id }                        -> req.user is the User document
//  - client token -> { role: "client", inviteId }  -> req.user is a small plain object,
//    and the invite must still be valid (not revoked, not expired). This is what makes
//    "Revoke access" actually work instead of the token living on for 7 days.
const authenticate = async (req, res, { allowStaff, allowClient }) => {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token provided");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401);
    throw new Error("Not authorized, token invalid or expired");
  }

  if (decoded.role === "client") {
    if (!allowClient) {
      res.status(403);
      throw new Error("This action is not available with client access");
    }
    const invite = mongoose.isValidObjectId(decoded.inviteId) ? await ClientInvite.findById(decoded.inviteId) : null;
    const stillValid =
      invite && !invite.revokedAt && invite.expiresAt > new Date() && invite.project.toString() === decoded.projectId;
    if (!stillValid) {
      res.status(401);
      throw new Error("Client access has been revoked or has expired");
    }
    req.user = {
      _id: decoded.id,
      role: "client",
      projectId: decoded.projectId,
      inviteId: decoded.inviteId,
      name: decoded.name || "Client",
      email: decoded.email || "",
    };
    return;
  }

  if (!allowStaff) {
    res.status(403);
    throw new Error("This action is only available to client access");
  }

  const user = mongoose.isValidObjectId(decoded.id) ? await User.findById(decoded.id).select("-password") : null;
  if (!user) {
    res.status(401);
    throw new Error("Not authorized, user not found");
  }
  req.user = user;
};

// Staff only (freelancer / team member). Client tokens are rejected with 403.
export const protect = asyncHandler(async (req, res, next) => {
  await authenticate(req, res, { allowStaff: true, allowClient: false });
  next();
});

// Client portal only (magic-link users).
export const protectClient = asyncHandler(async (req, res, next) => {
  await authenticate(req, res, { allowStaff: false, allowClient: true });
  next();
});

// Both kinds of user (e.g. notifications, which the portal also shows).
export const protectAny = asyncHandler(async (req, res, next) => {
  await authenticate(req, res, { allowStaff: true, allowClient: true });
  next();
});

// Restrict route to project owner/editor
export const requireProjectRole = (allowedRoles = ["owner", "editor", "viewer"]) =>
  asyncHandler(async (req, res, next) => {
    const project = req.project; // attached by a prior loadProject middleware
    if (!project) {
      res.status(404);
      throw new Error("Project not found in request context");
    }
    const isOwner = project.owner.toString() === req.user._id.toString();
    const member = project.members.find((m) => m.user.toString() === req.user._id.toString());
    const role = isOwner ? "owner" : member?.role;

    if (!role || !allowedRoles.includes(role)) {
      res.status(403);
      throw new Error("You do not have permission to perform this action");
    }
    req.userRole = role;
    next();
  });