import { conversationRepository } from '../repositories/conversation.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { assignmentService } from './assignment.service.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';
import { AUDIT_ACTION, ACTOR_TYPE } from '../constants/audit.js';
import { AGENT_ROLE } from '../constants/conversation.js';
import { emitToRoom } from '../sockets/emit.js';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '../constants/socket.js';

export const conversationService = {
  getAll: async (queryParams) => {
    const { page, limit, offset } = getPagination(queryParams);
    const { status, priority, user_id, assigned_to } = queryParams;

    const [{ rows }, { rows: countRows }] = await Promise.all([
      conversationRepository.findAll({ status, priority, user_id, assigned_to, limit, offset }),
      conversationRepository.count({ status, priority, assigned_to }),
    ]);

    return {
      conversations: rows,
      pagination: buildPaginationMeta(parseInt(countRows[0].count), page, limit),
    };
  },

  getById: async (id) => {
    const { rows } = await conversationRepository.findById(id);
    if (!rows[0]) throw Object.assign(new Error('Conversation not found'), { status: 404 });
    return rows[0];
  },

  create: async ({ user_id, subject, priority }, actorId = null) => {
    const { rows } = await conversationRepository.create({ user_id, subject, priority });
    const conversation = rows[0];

    await auditRepository.log({
      conversation_id: conversation.id,
      action: AUDIT_ACTION.CONVERSATION_CREATED,
      actor_type: ACTOR_TYPE.USER,
      actor_id: user_id,
    });

    try {
      await assignmentService.smartAssign(conversation.id);
    } catch (_) {
      // no agents available — conversation stays unassigned
    }

    const full = await conversationService.getById(conversation.id);

    // Broadcast to all agents so their inbox updates in real time
    emitToRoom(SOCKET_ROOMS.agents(), SOCKET_EVENTS.CONVERSATION_CREATED, full).catch(() => {});

    return full;
  },

  updateStatus: async (id, status, actorId, actorType = ACTOR_TYPE.AGENT, snoozed_until = null) => {
    const existing = await conversationService.getById(id);

    const { rows } = await conversationRepository.updateStatus(id, status, snoozed_until);

    await auditRepository.log({
      conversation_id: id,
      action: AUDIT_ACTION.STATUS_CHANGED,
      actor_type: actorType,
      actor_id: actorId,
      metadata: { from: existing.status, to: status, snoozed_until },
    });

    return rows[0];
  },

  assign: async (conversationId) => {
    return assignmentService.smartAssign(conversationId);
  },

  selfAssign: async (conversationId, agentId) => {
    await conversationService.getById(conversationId);
    return assignmentService.selfAssign(conversationId, agentId);
  },

  addAgent: async (conversationId, agentId, role = AGENT_ROLE.CONTRIBUTOR) => {
    await conversationService.getById(conversationId);
    return assignmentService.addAgent(conversationId, agentId, role);
  },

  getAuditLog: async (conversationId) => {
    await conversationService.getById(conversationId);
    const { rows } = await auditRepository.findByConversation(conversationId);
    return rows;
  },
};
