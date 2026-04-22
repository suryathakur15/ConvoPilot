import api from './api.js';

export const userAPI = {
  getAll:   (params) => api.get('/users', { params }),
  getById:  (id)     => api.get(`/users/${id}`),
  upsert:   (data)   => api.post('/users', data),
};
