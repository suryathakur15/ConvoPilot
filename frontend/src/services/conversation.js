import api from './api.js';

export const conversationAPI = {
  getAll:       (params)       => api.get('/conversations', { params }),
  getById:      (id)           => api.get(`/conversations/${id}`),
  create:       (data)         => api.post('/conversations', data),
  updateStatus: (id, data)     => api.patch(`/conversations/${id}/status`, data),
  assign:       (id)           => api.post(`/conversations/${id}/assign`),
  selfAssign:   (id)           => api.post(`/conversations/${id}/self-assign`),
  addAgent:     (id, data)     => api.post(`/conversations/${id}/agents`, data),
  addTag:       (id, tag)      => api.post(`/conversations/${id}/tags`, { tag }),
  removeTag:    (id, tag)      => api.delete(`/conversations/${id}/tags/${tag}`),
  getAuditLog:  (id)           => api.get(`/conversations/${id}/audit`),
};
