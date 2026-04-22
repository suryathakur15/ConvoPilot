import { query } from '../config/db.js';

export const analyticsService = {
  agentLoad: async () => {
    const { rows } = await query(`
      SELECT
        a.id,
        a.name,
        a.status,
        a.max_conversations,
        COUNT(CASE WHEN c.status = 'open' THEN 1 END)   AS open_conversations,
        COUNT(CASE WHEN c.status = 'closed' THEN 1 END) AS closed_conversations,
        COUNT(ca.id) AS total_assigned
      FROM agents a
      LEFT JOIN conversation_agents ca ON ca.agent_id = a.id
      LEFT JOIN conversations c ON c.id = ca.conversation_id
      GROUP BY a.id
      ORDER BY open_conversations DESC
    `);
    return rows;
  },

  avgResponseTime: async () => {
    const { rows } = await query(`
      SELECT
        ca.agent_id,
        a.name AS agent_name,
        ROUND(AVG(
          EXTRACT(EPOCH FROM (m_agent.created_at - m_user.created_at)) / 60
        )::numeric, 2) AS avg_response_time_minutes
      FROM conversation_agents ca
      JOIN agents a ON a.id = ca.agent_id
      JOIN LATERAL (
        SELECT MIN(created_at) AS created_at FROM messages
        WHERE conversation_id = ca.conversation_id AND sender_type = 'user'
      ) m_user ON true
      JOIN LATERAL (
        SELECT MIN(created_at) AS created_at FROM messages
        WHERE conversation_id = ca.conversation_id AND sender_type = 'agent'
      ) m_agent ON true
      WHERE m_agent.created_at > m_user.created_at
      GROUP BY ca.agent_id, a.name
      ORDER BY avg_response_time_minutes ASC
    `);
    return rows;
  },

  conversationStats: async (conversationId) => {
    const { rows } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE message_type = 'text') AS text_messages,
        COUNT(*) FILTER (WHERE message_type = 'note') AS internal_notes,
        COUNT(*) FILTER (WHERE sender_type = 'user')  AS user_messages,
        COUNT(*) FILTER (WHERE sender_type = 'agent') AS agent_messages,
        MIN(created_at) AS first_message_at,
        MAX(created_at) AS last_message_at
      FROM messages WHERE conversation_id = $1
    `, [conversationId]);
    return rows[0];
  },

  overview: async () => {
    const { rows } = await query(`
      SELECT
        (SELECT COUNT(*) FROM conversations WHERE status = 'open')   AS open_conversations,
        (SELECT COUNT(*) FROM conversations WHERE status = 'closed') AS closed_conversations,
        (SELECT COUNT(*) FROM conversations WHERE status = 'snoozed') AS snoozed_conversations,
        (SELECT COUNT(*) FROM conversations WHERE created_at > NOW() - INTERVAL '24 hours') AS new_today,
        (SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '24 hours') AS messages_today,
        (SELECT COUNT(*) FROM agents WHERE status = 'online') AS agents_online
    `);
    return rows[0];
  },
};
