import express from "express";
import { protect } from "../middleware/auth.js";
import { loadProject } from "../middleware/project.js";
import { getProjectInvoices } from "../controllers/invoiceController.js";

const router = express.Router();
router.use(protect);

router.get("/:projectId/invoices", loadProject, getProjectInvoices);

export default router;
