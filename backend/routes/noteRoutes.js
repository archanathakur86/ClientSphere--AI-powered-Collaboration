import express from "express";
import { protect } from "../middleware/auth.js";
import { updateNote, deleteNote, explainNote, improveNote, toggleNoteVisibility } from "../controllers/noteController.js";
import { extractTasksFromNote } from "../controllers/aiController.js";
import { aiLimiter } from "../middleware/rateLimiter.js";
import { validate } from "../middleware/validate.js";
import { updateNoteSchema, noteVisibilitySchema } from "../utils/validationSchemas.js";

const router = express.Router();
router.use(protect);

router.route("/:noteId").patch(validate(updateNoteSchema), updateNote).delete(deleteNote);
router.post("/:noteId/explain", aiLimiter, explainNote);
router.post("/:noteId/improve", aiLimiter, improveNote);
router.post("/:noteId/extract-tasks", aiLimiter, extractTasksFromNote);
router.patch("/:noteId/visibility", validate(noteVisibilitySchema), toggleNoteVisibility);

export default router;

