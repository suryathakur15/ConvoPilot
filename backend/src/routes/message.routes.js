import { Router } from 'express';
import { messageController } from '../controllers/message.controller.js';
import { validate } from '../middlewares/validate.js';
import { sendMessageSchema, replySchema } from '../validators/message.validator.js';

// Mounted at /api/conversations/:conversationId/messages
const conversationMessageRouter = Router({ mergeParams: true });
conversationMessageRouter.get('/',    messageController.getByConversation);
conversationMessageRouter.post('/',   validate(sendMessageSchema), messageController.send);

// Mounted at /api/messages
const messageRouter = Router();
messageRouter.post('/:messageId/reply', validate(replySchema), messageController.reply);

export { conversationMessageRouter, messageRouter };
