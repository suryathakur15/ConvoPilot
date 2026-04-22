import { Router } from 'express';
import { conversationController } from '../controllers/conversation.controller.js';
import { validate } from '../middlewares/validate.js';
import {
  createConversationSchema,
  updateStatusSchema,
  addAgentSchema,
} from '../validators/conversation.validator.js';

const router = Router();

router.get('/',                conversationController.getAll);
router.post('/',               validate(createConversationSchema), conversationController.create);
router.get('/:id',             conversationController.getById);
router.patch('/:id/status',    validate(updateStatusSchema), conversationController.updateStatus);
router.post('/:id/assign',       conversationController.assign);
router.post('/:id/self-assign',  conversationController.selfAssign);
router.post('/:id/agents',     validate(addAgentSchema), conversationController.addAgent);
router.post('/:id/tags',       conversationController.addTag);
router.delete('/:id/tags/:tag', conversationController.removeTag);
router.get('/:id/audit',       conversationController.getAuditLog);

export default router;
