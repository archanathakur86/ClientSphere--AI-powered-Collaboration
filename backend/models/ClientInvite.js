import mongoose from "mongoose";

const clientInviteSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("ClientInvite", clientInviteSchema);
