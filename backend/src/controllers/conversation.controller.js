import { conversationService } from '../services/conversation.service.js';
import { success, created, paginated } from '../utils/response.js';
import { ACTOR_TYPE } from '../constants/audit.js';
import { agentAuthService, AGENT_COOKIE_NAME } from '../services/agentAuth.service.js';
import { parseCookie } from '../utils/parseCookie.js';

export const conversationController = {
  getAll: async (req, res, next) => {
    try {
      const { conversations, pagination } = await conversationService.getAll(req.query);
      paginated(res, conversations, pagination);
    } catch (err) { next(err); }
  },

  getById: async (req, res, next) => {
    try {
      const data = await conversationService.getById(req.params.id);
      success(res, data);
    } catch (err) { next(err); }
  },

  create: async (req, res, next) => {
    try {
      const data = await conversationService.create(req.body);
      created(res, data);
    } catch (err) { next(err); }
  },

  updateStatus: async (req, res, next) => {
    try {
      const { status, snoozed_until, actor_id } = req.body;
      const data = await conversationService.updateStatus(
        req.params.id, status, actor_id, ACTOR_TYPE.AGENT, snoozed_until ?? null
      );
      success(res, data);
    } catch (err) { next(err); }
  },

  assign: async (req, res, next) => {
    try {
      const data = await conversationService.assign(req.params.id);
      success(res, data);
    } catch (err) { next(err); }
  },

  selfAssign: async (req, res, next) => {
    try {
      const token = parseCookie(req, AGENT_COOKIE_NAME);
      const agent = await agentAuthService.getSession(token);
      if (!agent) return res.status(401).json({ success: false, error: { message: 'Not authenticated' } });
      const data = await conversationService.selfAssign(req.params.id, agent.id);
      success(res, data);
    } catch (err) { next(err); }
  },

  addAgent: async (req, res, next) => {
    try {
      const { agent_id, role } = req.body;
      const data = await conversationService.addAgent(req.params.id, agent_id, role);
      success(res, data);
    } catch (err) { next(err); }
  },

  addTag: async (req, res, next) => {
    try {
      const { tag } = req.body;
      if (!tag) return res.status(400).json({ success: false, error: { message: 'tag is required' } });
      await conversationService.getById(req.params.id); // 404 guard
      const { rows } = await (await import('../repositories/conversation.repository.js'))
        .conversationRepository.addTag(req.params.id, tag);
      success(res, rows[0] || { tag });
    } catch (err) { next(err); }
  },

  removeTag: async (req, res, next) => {
    try {
      await conversationService.getById(req.params.id); // 404 guard
      await (await import('../repositories/conversation.repository.js'))
        .conversationRepository.removeTag(req.params.id, req.params.tag);
      success(res, { removed: true });
    } catch (err) { next(err); }
  },

  getAuditLog: async (req, res, next) => {
    try {
      const data = await conversationService.getAuditLog(req.params.id);
      success(res, data);
    } catch (err) { next(err); }
  },
};
