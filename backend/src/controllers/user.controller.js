import { userService } from '../services/user.service.js';
import { success, created } from '../utils/response.js';

export const userController = {
  getAll: async (req, res, next) => {
    try {
      const { users, pagination } = await userService.getAll(req.query);
      res.json({ success: true, data: users, pagination });
    } catch (err) { next(err); }
  },

  getById: async (req, res, next) => {
    try {
      const data = await userService.getById(req.params.id);
      success(res, data);
    } catch (err) { next(err); }
  },

  upsert: async (req, res, next) => {
    try {
      const data = await userService.upsert(req.body);
      created(res, data);
    } catch (err) { next(err); }
  },
};
