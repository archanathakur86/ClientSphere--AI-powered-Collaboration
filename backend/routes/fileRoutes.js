import express from "express";
import { protect } from "../middleware/auth.js";
import { deleteFile, downloadFile, explainFile, reviewFile } from "../controllers/fileController.js";
import { aiLimiter } from "../middleware/rateLimiter.js";
import { validate } from "../middleware/validate.js";
import { fileReviewSchema } from "../utils/validationSchemas.js";

const router = express.Router();
router.use(protect);

router.get("/:fileId/download", downloadFile);
router.delete("/:fileId", deleteFile);
router.post("/:fileId/explain", aiLimiter, explainFile);
router.post("/:fileId/review", aiLimiter, validate(fileReviewSchema), reviewFile);

export default router;