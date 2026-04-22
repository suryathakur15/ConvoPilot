import { agentRepository } from '../repositories/agent.repository.js';
import { conversationRepository } from '../repositories/conversation.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { AUDIT_ACTION, ACTOR_TYPE } from '../constants/audit.js';
import { AGENT_ROLE } from '../constants/conversation.js';

export const assignmentService = {
  smartAssign: async (conversationId) => {
    const { rows: agents } = await agentRepository.findOnlineWithLoad();

    if (!agents.length) {
      throw Object.assign(new Error('No agents available for assignment'), { status: 409 });
    }

    const best = agents.reduce((prev, curr) =>
      parseInt(curr.active_count) < parseInt(prev.active_count) ||
      (parseInt(curr.active_count) === parseInt(prev.active_count) && parseInt(curr.max_conversations) > parseInt(prev.max_conversations))
        ? curr : prev
    );

    const { rows: convAgents } = await conversationRepository.getAgents(conversationId);
    const existingPrimary = convAgents.find((a) => a.role === AGENT_ROLE.PRIMARY);

    if (existingPrimary && existingPrimary.id === best.id) {
      return existingPrimary;
    }

    if (existingPrimary) {
      await conversationRepository.removeAgent(conversationId, existingPrimary.id);
    }

    await conversationRepository.addAgent(conversationId, best.id, AGENT_ROLE.PRIMARY);

    await auditRepository.log({
      conversation_id: conversationId,
      action: AUDIT_ACTION.CONVERSATION_ASSIGNED,
      actor_type: ACTOR_TYPE.SYSTEM,
      metadata: { agent_id: best.id, agent_name: best.name, role: AGENT_ROLE.PRIMARY },
    });

    return best;
  },

  selfAssign: async (conversationId, agentId) => {
    const { rows: convAgents } = await conversationRepository.getAgents(conversationId);
    const existingPrimary = convAgents.find((a) => a.role === AGENT_ROLE.PRIMARY);

    // Already assigned to this agent — idempotent
    if (existingPrimary && existingPrimary.id === agentId) {
      return existingPrimary;
    }

    // Remove any existing primary first
    if (existingPrimary) {
      await conversationRepository.removeAgent(conversationId, existingPrimary.id);
    }

    await conversationRepository.addAgent(conversationId, agentId, AGENT_ROLE.PRIMARY);

    await auditRepository.log({
      conversation_id: conversationId,
      action: AUDIT_ACTION.CONVERSATION_ASSIGNED,
      actor_type: ACTOR_TYPE.AGENT,
      actor_id: agentId,
      metadata: { agent_id: agentId, role: AGENT_ROLE.PRIMARY, self_assigned: true },
    });

    const { rows: agentRows } = await agentRepository.findById(agentId);
    return agentRows[0];
  },

  addAgent: async (conversationId, agentId, role = AGENT_ROLE.CONTRIBUTOR) => {
    const { rows } = await conversationRepository.addAgent(conversationId, agentId, role);

    await auditRepository.log({
      conversation_id: conversationId,
      action: AUDIT_ACTION.AGENT_JOINED,
      actor_type: ACTOR_TYPE.AGENT,
      actor_id: agentId,
      metadata: { role },
    });

    return rows[0];
  },
};
