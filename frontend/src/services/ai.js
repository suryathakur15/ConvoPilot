import api from './api.js';

export const aiAPI = {
  suggestReply:  (conversationId) => api.post('/ai/reply', { conversation_id: conversationId }),
  summarize:     (conversationId) => api.post('/ai/summarize', { conversation_id: conversationId }),
  improveTone:   (draft, conversationId = null) =>
    api.post('/ai/improve-tone', { draft, ...(conversationId && { conversation_id: conversationId }) }),
};
