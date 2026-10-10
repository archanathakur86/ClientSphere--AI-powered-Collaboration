import express from "express";
import { protectClient } from "../middleware/auth.js";
import { loadClientProject } from "../middleware/clientProject.js";
import { getClientPortalByToken, approveMilestoneForClient, requestChangesForClient } from "../controllers/projectController.js";
import { addComment, downloadCommentAttachment } from "../controllers/commentController.js";
import upload from "../middleware/upload.js";
import { createPaymentSession, downloadInvoicePdf } from "../controllers/invoiceController.js";
import { downloadSharedFileForClient } from "../controllers/fileController.js";
import { validate } from "../middleware/validate.js";
import { addCommentSchema, requestChangesSchema } from "../utils/validationSchemas.js";

const router = express.Router();
router.use(protectClient);

router.get("/:projectId", loadClientProject, getClientPortalByToken);
router.post("/:projectId/milestones/:milestoneId/approve", loadClientProject, approveMilestoneForClient);
router.post("/:projectId/milestones/:milestoneId/request-changes", loadClientProject, validate(requestChangesSchema), requestChangesForClient);
router.post("/:projectId/comments", loadClientProject, upload.single("file"), validate(addCommentSchema), addComment);
router.get("/:projectId/comments/:commentId/attachments/:index", loadClientProject, downloadCommentAttachment);
router.post("/:projectId/invoices/:invoiceId/payment-session", loadClientProject, createPaymentSession);
router.get("/:projectId/invoices/:invoiceId/pdf", loadClientProject, downloadInvoicePdf);
router.get("/:projectId/files/:fileId/download", loadClientProject, downloadSharedFileForClient);

export default router;