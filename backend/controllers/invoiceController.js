import asyncHandler from "express-async-handler";
import PDFDocument from "pdfkit";
import Invoice from "../models/Invoice.js";
import Project from "../models/Project.js";
import { loadProjectForUser } from "../middleware/projectAccess.js";
import { createStripeCheckout, verifyStripeWebhook, hasStripe } from "../services/paymentService.js";
import { sendEmail } from "../services/emailService.js";
import { invoiceEmail } from "../services/emailTemplates.js";
import { createProjectNotifications, recipientKeyForUser } from "../services/notificationService.js";

const generatePdfBuffer = async (invoice, project) => {
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const bufferPromise = new Promise((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  doc.fontSize(22).text("ClientSphere Invoice", { align: "left" });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor("#444").text(`Invoice #${invoice.invoiceNumber || invoice._id.toString()}`);
  doc.text(`Project: ${project.name}`);
  doc.text(`Status: ${invoice.status}`);
  doc.text(`Issue date: ${new Date(invoice.issueDate).toLocaleDateString()}`);
  if (invoice.dueDate) doc.text(`Due date: ${new Date(invoice.dueDate).toLocaleDateString()}`);
  doc.moveDown();
  doc.fontSize(14).fillColor("#111").text("Amount Due", { underline: true });
  doc.fontSize(20).text(`$${Number(invoice.amount || 0).toFixed(2)}`);
  doc.moveDown();
  doc.fontSize(11).fillColor("#555").text(`Client: ${invoice.clientEmail}`);
  doc.text("Thank you for working with ClientSphere.");
  doc.end();

  return bufferPromise;
};

const loadInvoiceContext = async (res, invoiceId, user, { allowClient = false } = {}) => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    res.status(404);
    throw new Error("Invoice not found");
  }
  const project = await Project.findById(invoice.project);
  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  if (user.role === "client") {
    if (!allowClient) {
      res.status(403);
      throw new Error("You do not have permission to perform this action");
    }
    // A client only ever sees invoices of their own project, and never drafts.
    if (user.projectId !== project._id.toString() || invoice.status === "draft") {
      res.status(404);
      throw new Error("Invoice not found");
    }
  } else {
    await loadProjectForUser(res, project._id, user, ["owner", "editor"]);
  }

  return { invoice, project };
};

export const getProjectInvoices = asyncHandler(async (req, res) => {
  // Money data: owner/editor only. Works for both /projects/:projectId/invoices and
  // /invoices/project/:projectId (the latter has no loadProject middleware).
  const { project } = await loadProjectForUser(res, req.params.projectId, req.user, ["owner", "editor"]);
  const invoices = await Invoice.find({ project: project._id }).sort({ createdAt: -1 });
  res.json({ success: true, invoices });
});

export const updateInvoice = asyncHandler(async (req, res) => {
  const { invoice } = await loadInvoiceContext(res, req.params.invoiceId, req.user);
  const { amount, dueDate, status } = req.body;
  if (invoice.status === "paid") {
    res.status(400);
    throw new Error("Paid invoices cannot be edited");
  }
  if (amount !== undefined) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) {
      res.status(400);
      throw new Error("Amount must be a number of 0 or more");
    }
    invoice.amount = value;
  }
  if (dueDate !== undefined) invoice.dueDate = dueDate ? new Date(dueDate) : null;
  if (status !== undefined) invoice.status = status;
  await invoice.save();
  res.json({ success: true, invoice });
});

export const sendInvoice = asyncHandler(async (req, res) => {
  const { invoice, project } = await loadInvoiceContext(res, req.params.invoiceId, req.user);
  if (invoice.status === "paid") {
    res.status(400);
    throw new Error("Paid invoices cannot be sent again");
  }
  // Sending a draft makes it visible to the client. Re-sending an overdue invoice
  // just re-notifies; it stays overdue.
  if (invoice.status === "draft") invoice.status = "sent";
  invoice.sentAt = new Date();
  await invoice.save();

  if (project.clientEmail) {
    // The PDF endpoint needs authentication, so the email links to the portal instead.
    const portalUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/client/${project._id}`;
    const { subject, html } = invoiceEmail({
      projectName: project.name,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      portalUrl,
      status: "sent",
    });
    try {
      await sendEmail({ to: project.clientEmail, subject, html });
    } catch (error) {
      console.error("Invoice email failed:", error.message);
    }
  }

  await createProjectNotifications(
    project,
    "invoice_sent",
    `Invoice ${invoice.invoiceNumber || invoice._id.toString()} sent`,
    `Invoice total $${Number(invoice.amount || 0).toFixed(2)}`,
    { invoiceId: invoice._id.toString() },
    [`user:${project.owner.toString()}`, `client:${project._id.toString()}`]
  );

  res.json({ success: true, invoice });
});

export const createPaymentSession = asyncHandler(async (req, res) => {
  const { invoice, project } = await loadInvoiceContext(res, req.params.invoiceId, req.user, { allowClient: true });
  if (invoice.status === "paid") {
    res.status(400);
    throw new Error("This invoice is already paid");
  }
  if (invoice.status === "draft") {
    res.status(400);
    throw new Error("This invoice has not been sent yet");
  }
  if (!(Number(invoice.amount) > 0)) {
    res.status(400);
    throw new Error("Invoice amount must be greater than zero");
  }
  if (!hasStripe()) {
    res.status(400);
    throw new Error("Stripe is not configured");
  }
  const successUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/client/${project._id}?paid=1`;
  const cancelUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/client/${project._id}?payment=cancelled`;
  const session = await createStripeCheckout({ invoice, successUrl, cancelUrl });
  invoice.stripeSessionId = session.id;
  await invoice.save();
  res.json({ success: true, url: session.url, sessionId: session.id });
});

export const downloadInvoicePdf = asyncHandler(async (req, res) => {
  const { invoice, project } = await loadInvoiceContext(res, req.params.invoiceId, req.user, { allowClient: true });
  const pdfBuffer = await generatePdfBuffer(invoice, project);
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename=invoice-${invoice.invoiceNumber || invoice._id}.pdf`,
    "Content-Length": pdfBuffer.length,
  });
  res.send(pdfBuffer);
});

export const stripeWebhook = asyncHandler(async (req, res) => {
  if (!hasStripe()) {
    res.status(400);
    throw new Error("Stripe is not configured");
  }

  let event;
  try {
    event = verifyStripeWebhook(req.body, req.headers["stripe-signature"]);
  } catch (err) {
    res.status(400);
    throw new Error(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const invoice = await Invoice.findById(session.metadata?.invoiceId);
    // Stripe retries webhooks, so ignore invoices that are already paid (no duplicate emails).
    if (invoice && invoice.status !== "paid" && session.payment_status === "paid") {
      invoice.status = "paid";
      invoice.paidAt = new Date();
      invoice.stripePaymentIntentId = session.payment_intent || "";
      await invoice.save();
      const project = await Project.findById(invoice.project);
      if (project) {
        await createProjectNotifications(
          project,
          "invoice_paid",
          `Invoice ${invoice.invoiceNumber || invoice._id.toString()} paid`,
          `Payment of $${Number(invoice.amount || 0).toFixed(2)} received.`,
          { invoiceId: invoice._id.toString() },
          [`user:${project.owner.toString()}`, `client:${project._id.toString()}`]
        );
        if (project.clientEmail) {
          const portalUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/client/${project._id}`;
          const { subject, html } = invoiceEmail({
            projectName: project.name,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.amount,
            portalUrl,
            status: "paid",
          });
          try {
            await sendEmail({ to: project.clientEmail, subject, html });
          } catch (error) {
            console.error("Paid-invoice email failed:", error.message);
          }
        }
      }
    }
  }

  res.json({ received: true });
});

export const processOverdueInvoices = async () => {
  // Drafts are private to the freelancer, so only sent invoices can become overdue.
  const overdue = await Invoice.find({ status: "sent", dueDate: { $lte: new Date() } });
  for (const invoice of overdue) {
    invoice.status = "overdue";
    await invoice.save();
    const project = await Project.findById(invoice.project);
    if (project) {
      await createProjectNotifications(
        project,
        "invoice_overdue",
        `Invoice ${invoice.invoiceNumber || invoice._id.toString()} is overdue`,
        `Amount due $${Number(invoice.amount || 0).toFixed(2)}`,
        { invoiceId: invoice._id.toString() },
        [`user:${project.owner.toString()}`, `client:${project._id.toString()}`]
      );
    }
  }
};