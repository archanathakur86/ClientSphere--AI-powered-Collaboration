import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    url: { type: String, required: true },
    publicId: { type: String, default: "" },
    fileType: { type: String, default: "" },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);
const commentSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    authorName: { type: String, default: "" },
    authorEmail: { type: String, default: "" },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    isShared: { type: Boolean, default: false },
    embedding: [{ type: Number }],
    scopeVerdict: { type: String, default: "" },
    scopeReason: { type: String, default: "" },
    scopeSuggestedReply: { type: String, default: "" },
    attachments: [attachmentSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Comment", commentSchema);