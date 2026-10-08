import express from "express";
import { protect } from "../middleware/auth.js";
import { getProjectInvoices, updateInvoice, sendInvoice, createPaymentSession, downloadInvoicePdf } from "../controllers/invoiceController.js";
import { validate } from "../middleware/validate.js";
import { invoiceUpdateSchema } from "../utils/validationSchemas.js";

const router = express.Router();
router.use(protect);

router.get("/project/:projectId", getProjectInvoices);
router.patch("/:invoiceId", validate(invoiceUpdateSchema), updateInvoice);
router.post("/:invoiceId/send", sendInvoice);
router.post("/:invoiceId/payment-session", createPaymentSession);
router.get("/:invoiceId/pdf", downloadInvoicePdf);

export default router;
