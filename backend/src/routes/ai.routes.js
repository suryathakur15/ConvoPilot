import { Router } from 'express';
import { aiController } from '../controllers/ai.controller.js';
import { validate } from '../middlewares/validate.js';
import { aiRateLimiter } from '../middlewares/rateLimiter.js';
import Joi from 'joi';

const router = Router();

const conversationIdSchema = Joi.object({ conversation_id: Joi.string().uuid().required() });
const improveToneSchema = Joi.object({
  draft: Joi.string().min(1).max(5000).required(),
  conversation_id: Joi.string().uuid().optional(),
});

router.use(aiRateLimiter);

router.post('/reply',        validate(conversationIdSchema), aiController.suggestReply);
router.post('/summarize',    validate(conversationIdSchema), aiController.summarize);
router.post('/improve-tone', validate(improveToneSchema),    aiController.improveTone);

export default router;
