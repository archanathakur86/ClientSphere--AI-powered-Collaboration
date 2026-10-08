import express from "express";
import { protect } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimiter.js";
import { validate } from "../middleware/validate.js";
import { assistantChatSchema, rememberFactSchema } from "../utils/validationSchemas.js";
import {
  chatWithAssistant,
  listConversations,
  getConversation,
  deleteConversation,
  rememberFact,
} from "../controllers/assistantController.js";

const router = express.Router();
router.use(protect);

router.post("/chat", aiLimiter, validate(assistantChatSchema), chatWithAssistant);
router.get("/conversations", listConversations);
router.get("/conversations/:id", getConversation);
router.delete("/conversations/:id", deleteConversation);
router.post("/remember", aiLimiter, validate(rememberFactSchema), rememberFact);

export default router;