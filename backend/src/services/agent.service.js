import { agentRepository } from '../repositories/agent.repository.js';
import { AGENT_STATUS } from '../constants/agent.js';

export const agentService = {
  getAll: async () => {
    const { rows } = await agentRepository.findAll();
    return rows;
  },

  getById: async (id) => {
    const { rows } = await agentRepository.findById(id);
    if (!rows[0]) throw Object.assign(new Error('Agent not found'), { status: 404 });
    return rows[0];
  },

  updateStatus: async (id, status) => {
    if (!Object.values(AGENT_STATUS).includes(status)) {
      throw Object.assign(new Error('Invalid status'), { status: 400 });
    }
    const { rows } = await agentRepository.updateStatus(id, status);
    if (!rows[0]) throw Object.assign(new Error('Agent not found'), { status: 404 });
    return rows[0];
  },

  create: async (data) => {
    const { rows } = await agentRepository.create(data);
    return rows[0];
  },
};
