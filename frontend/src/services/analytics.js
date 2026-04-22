import api from './api.js';

export const analyticsAPI = {
  overview:         () => api.get('/analytics/overview'),
  agentLoad:        () => api.get('/analytics/agent-load'),
  avgResponseTime:  () => api.get('/analytics/response-time'),
};
