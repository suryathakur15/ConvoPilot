import axios from 'axios';
import { messageService } from './message.service.js';
import { env } from '../config/env.js';
import { AI_ENDPOINTS } from '../constants/ai.js';
import { logger } from '../utils/logger.js';

const aiClient = axios.create({
  baseURL: env.ai.serviceUrl,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

const callAI = async (endpoint, payload) => {
  try {
    const { data } = await aiClient.post(endpoint, payload);
    return data;
  } catch (err) {
    // If the AI micro-service responded with a structured error, forward it as-is
    // so the client sees "quota exceeded" / "invalid key" instead of a generic 503.
    if (err.response?.data?.error?.message) {
      const msg    = err.response.data.error.message;
      const status = err.response.status || 503;
      logger.warn('AI service returned error', { endpoint, status, msg });
      throw Object.assign(new Error(msg), { status });
    }
    logger.error('AI service call failed', { endpoint, error: err.message });
    throw Object.assign(new Error('AI service unavailable'), { status: 503 });
  }
};

export const aiService = {
  analyzeSentiment: async (conversationId) => {
    // Sentiment reflects the *current* emotional state — last 5 messages is enough.
    // Using the full history adds noise (old frustration that's since been resolved)
    // and burns unnecessary tokens.
    const messages = await messageService.getContextMessages(conversationId, 5);
    const hasUserMessages = messages.some((m) => m.sender_type === 'user');
    if (!hasUserMessages) return null;
    return callAI(AI_ENDPOINTS.ANALYZE_SENTIMENT, { messages });
  },

  suggestReply: async (conversationId) => {
    const messages = await messageService.getContextMessages(conversationId, env.ai.maxContextMessages);
    return callAI(AI_ENDPOINTS.SUGGEST_REPLY, { messages });
  },

  summarize: async (conversationId) => {
    const messages = await messageService.getContextMessages(conversationId, env.ai.maxContextMessages);
    return callAI(AI_ENDPOINTS.SUMMARIZE, { messages });
  },

  improveTone: async (draft, conversationId = null) => {
    const context = conversationId
      ? await messageService.getContextMessages(conversationId, 5)
      : [];
    return callAI(AI_ENDPOINTS.IMPROVE_TONE, { draft, context });
  },

  autoTag: async (conversationId, userMessage) => {
    try {
      return await callAI(AI_ENDPOINTS.AUTO_TAG, { message: userMessage });
    } catch (_) {
      return { tags: ['general'] };
    }
  },
};
