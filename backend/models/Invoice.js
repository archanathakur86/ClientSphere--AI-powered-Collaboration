import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    milestone: { type: mongoose.Schema.Types.ObjectId, ref: "Milestone", required: true },
    clientEmail: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ["draft", "sent", "paid", "overdue"], default: "draft" },
    currency: { type: String, default: "usd" },
    invoiceNumber: { type: String, default: "" },
    dueDate: { type: Date, default: null },
    issueDate: { type: Date, default: Date.now },
    sentAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    pdfUrl: { type: String, default: "" },
    stripeSessionId: { type: String, default: "" },
    stripePaymentIntentId: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Invoice", invoiceSchema);
