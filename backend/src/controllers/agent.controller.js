import { agentService } from '../services/agent.service.js';
import { success, created } from '../utils/response.js';

export const agentController = {
  getAll: async (req, res, next) => {
    try {
      const data = await agentService.getAll();
      success(res, data);
    } catch (err) { next(err); }
  },

  getById: async (req, res, next) => {
    try {
      const data = await agentService.getById(req.params.id);
      success(res, data);
    } catch (err) { next(err); }
  },

  updateStatus: async (req, res, next) => {
    try {
      const data = await agentService.updateStatus(req.params.id, req.body.status);
      success(res, data);
    } catch (err) { next(err); }
  },

  create: async (req, res, next) => {
    try {
      const data = await agentService.create(req.body);
      created(res, data);
    } catch (err) { next(err); }
  },
};
