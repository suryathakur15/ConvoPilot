import Joi from 'joi';
import { SENDER_TYPE, MESSAGE_TYPE } from '../constants/message.js';

export const sendMessageSchema = Joi.object({
  sender_type: Joi.string().valid(...Object.values(SENDER_TYPE)).required(),
  sender_id:   Joi.string().uuid().required(),
  content:     Joi.string().min(1).max(10000).required(),
  message_type: Joi.string().valid(...Object.values(MESSAGE_TYPE)).default('text'),
  parent_message_id: Joi.string().uuid().optional(),
});

export const replySchema = Joi.object({
  conversation_id: Joi.string().uuid().required(),
  sender_type: Joi.string().valid(...Object.values(SENDER_TYPE)).required(),
  sender_id:   Joi.string().uuid().required(),
  content:     Joi.string().min(1).max(10000).required(),
  message_type: Joi.string().valid(...Object.values(MESSAGE_TYPE)).default('text'),
});
