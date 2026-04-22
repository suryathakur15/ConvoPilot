import api from './api.js';

export const authAPI = {
  signup: (data)  => api.post('/auth/signup', data, { withCredentials: true }),
  login:  (data)  => api.post('/auth/login',  data, { withCredentials: true }),
  logout: ()      => api.post('/auth/logout',  {},   { withCredentials: true }),
  me:     ()      => api.get('/auth/me',             { withCredentials: true }),
};
