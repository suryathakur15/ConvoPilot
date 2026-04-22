import { messageService } from '../services/message.service.js';
import { runPostMessageJobs } from '../services/messageJobs.js';
import { success, created } from '../utils/response.js';

export const messageController = {
  getByConversation: async (req, res, next) => {
    try {
      const { messages, pagination } = await messageService.getByConversation(
        req.params.conversationId, req.query
      );
      res.json({ success: true, data: messages, pagination });
    } catch (err) { next(err); }
  },

  send: async (req, res, next) => {
    try {
      const data = await messageService.send({
        conversation_id: req.params.conversationId,
        ...req.body,
      });
      created(res, data);
      // Fire AI background jobs for user messages after responding
      if (req.body.sender_type === 'user') {
        runPostMessageJobs(req.params.conversationId, req.body.content);
      }
    } catch (err) { next(err); }
  },

  reply: async (req, res, next) => {
    try {
      const data = await messageService.send({
        ...req.body,
        parent_message_id: req.params.messageId,
      });
      created(res, data);
    } catch (err) { next(err); }
  },
};
