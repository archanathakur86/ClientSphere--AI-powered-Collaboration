import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientKey: { type: String, required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    type: {
      type: String,
      enum: ["milestone_submitted", "milestone_approved", "milestone_changes_requested", "new_comment", "invoice_paid", "invoice_sent", "invoice_overdue", "task_assigned", "member_added"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    readAt: { type: Date, default: null },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientKey: 1, readAt: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
