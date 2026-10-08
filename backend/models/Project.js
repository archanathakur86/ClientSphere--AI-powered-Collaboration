import mongoose from "mongoose";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["owner", "editor", "viewer", "commentor"], default: "editor" },
  },
  { _id: false }
);

const activityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String }, // e.g. "note_created", "file_uploaded", "member_added"
    detail: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [memberSchema],
    clientEmail: { type: String, default: "", lowercase: true, trim: true },
    clientName: { type: String, default: "" },
    isPublic: { type: Boolean, default: false },
    publicSlug: { type: String, unique: true, sparse: true, default: () => nanoid() },
    readme: { type: String, default: "" },
    weeklyUpdateDraft: {
      content: { type: String, default: "" },
      generatedAt: { type: Date, default: null },
      sentAt: { type: Date, default: null },
      sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    // What the client actually sees in the portal. Only written when the freelancer
    // presses "Send" - drafts (weeklyUpdateDraft) are never shown to the client.
    publishedUpdate: {
      content: { type: String, default: "" },
      sentAt: { type: Date, default: null },
    },
    healthCache: {
      status: { type: String, enum: ["healthy", "slowing", "inactive"], default: "healthy" },
      score: { type: Number, default: 100 },
      reason: { type: String, default: "" },
      stats: { type: Object, default: {} },
      updatedAt: { type: Date, default: null },
    },
    activityLog: [activityLogSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Project", projectSchema);