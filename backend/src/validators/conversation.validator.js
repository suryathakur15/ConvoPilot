import Joi from 'joi';
import { CONVERSATION_STATUS, CONVERSATION_PRIORITY, AGENT_ROLE } from '../constants/conversation.js';

export const createConversationSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  subject: Joi.string().max(500).optional(),
  priority: Joi.string().valid(...Object.values(CONVERSATION_PRIORITY)).default('medium'),
});

export const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(CONVERSATION_STATUS)).required(),
  actor_id: Joi.string().uuid().optional(),
  snoozed_until: Joi.when('status', {
    is: 'snoozed',
    then: Joi.date().iso().greater('now').required(),
    otherwise: Joi.any().strip(),
  }),
});

export const addAgentSchema = Joi.object({
  agent_id: Joi.string().uuid().required(),
  role: Joi.string().valid(...Object.values(AGENT_ROLE)).default('contributor'),
});
