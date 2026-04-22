import { aiService } from '../services/ai.service.js';
import { success } from '../utils/response.js';

export const aiController = {
  suggestReply: async (req, res, next) => {
    try {
      const data = await aiService.suggestReply(req.body.conversation_id);
      // Python service wraps in { success, data } — unwrap so frontend gets flat payload
      success(res, data?.data ?? data);
    } catch (err) { next(err); }
  },

  summarize: async (req, res, next) => {
    try {
      const data = await aiService.summarize(req.body.conversation_id);
      success(res, data?.data ?? data);
    } catch (err) { next(err); }
  },

  improveTone: async (req, res, next) => {
    try {
      const data = await aiService.improveTone(req.body.draft, req.body.conversation_id);
      success(res, data?.data ?? data);
    } catch (err) { next(err); }
  },
};
