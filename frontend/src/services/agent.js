import api from './api.js';

export const agentAPI = {
  getAll:       ()           => api.get('/agents'),
  getById:      (id)         => api.get(`/agents/${id}`),
  updateStatus: (id, status) => api.patch(`/agents/${id}/status`, { status }),
};
