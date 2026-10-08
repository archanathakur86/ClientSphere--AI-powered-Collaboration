import express from "express";
import { protect } from "../middleware/auth.js";
import { updateTask, deleteTask } from "../controllers/aiController.js";
import { validate } from "../middleware/validate.js";
import { updateTaskSchema } from "../utils/validationSchemas.js";

const router = express.Router();
router.use(protect);

router.route("/:taskId").patch(validate(updateTaskSchema), updateTask).delete(deleteTask);

export default router;

