import mongoose from "mongoose";

const milestoneSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    dueDate: { type: Date, default: null },
    amount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "in review", "changes requested", "approved"],
      default: "pending",
    },
    changeRequests: [
      {
        comment: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", default: null },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Milestone", milestoneSchema);
