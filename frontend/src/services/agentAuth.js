import api from './api.js';

export const agentAuthAPI = {
  signup: (data) => api.post('/agent-auth/signup', data, { withCredentials: true }),
  login:  (data) => api.post('/agent-auth/login',  data, { withCredentials: true }),
  logout: ()     => api.post('/agent-auth/logout',  {},   { withCredentials: true }),
  me:     ()     => api.get('/agent-auth/me',             { withCredentials: true }),
};
