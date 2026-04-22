import Joi from 'joi';
import { AGENT_STATUS } from '../constants/agent.js';

export const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(AGENT_STATUS)).required(),
});

export const createAgentSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  email: Joi.string().email().required(),
  status: Joi.string().valid(...Object.values(AGENT_STATUS)).default('offline'),
  max_conversations: Joi.number().integer().min(1).max(50).default(10),
});
