import api from './api.js';

export const messageAPI = {
  getByConversation: (conversationId, params) =>
    api.get(`/conversations/${conversationId}/messages`, { params }),
  send: (conversationId, data) =>
    api.post(`/conversations/${conversationId}/messages`, data),
  reply: (messageId, data) =>
    api.post(`/messages/${messageId}/reply`, data),
};
