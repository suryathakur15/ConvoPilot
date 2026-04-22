import { userRepository } from '../repositories/user.repository.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';

export const userService = {
  getAll: async (query) => {
    const { page, limit, offset } = getPagination(query);
    const [{ rows }, { rows: countRows }] = await Promise.all([
      userRepository.findAll({ limit, offset }),
      userRepository.count(),
    ]);
    return { users: rows, pagination: buildPaginationMeta(parseInt(countRows[0].count), page, limit) };
  },

  getById: async (id) => {
    const { rows } = await userRepository.findById(id);
    if (!rows[0]) throw Object.assign(new Error('User not found'), { status: 404 });
    return rows[0];
  },

  upsert: async (data) => {
    const { rows } = await userRepository.upsert(data);
    return rows[0];
  },
};
