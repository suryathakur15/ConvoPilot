import { analyticsService } from '../services/analytics.service.js';
import { success } from '../utils/response.js';

export const analyticsController = {
  agentLoad: async (req, res, next) => {
    try { success(res, await analyticsService.agentLoad()); }
    catch (err) { next(err); }
  },

  avgResponseTime: async (req, res, next) => {
    try { success(res, await analyticsService.avgResponseTime()); }
    catch (err) { next(err); }
  },

  conversationStats: async (req, res, next) => {
    try { success(res, await analyticsService.conversationStats(req.params.id)); }
    catch (err) { next(err); }
  },

  overview: async (req, res, next) => {
    try { success(res, await analyticsService.overview()); }
    catch (err) { next(err); }
  },
};
