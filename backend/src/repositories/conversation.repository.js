import { query, getClient } from '../config/db.js';

export const conversationRepository = {
  findAll: ({ status, priority, user_id, assigned_to, limit, offset }) => {
    const conditions = [];
    const params = [];
    let i = 1;

    if (status)      { conditions.push(`c.status = $${i++}`);   params.push(status); }
    if (priority)    { conditions.push(`c.priority = $${i++}`); params.push(priority); }
    if (user_id)     { conditions.push(`c.user_id = $${i++}`);  params.push(user_id); }
    // "Mine" filter — only conversations where this agent is primary
    if (assigned_to === 'unassigned') {
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM conversation_agents ca2
        WHERE ca2.conversation_id = c.id AND ca2.role = 'primary'
      )`);
    } else if (assigned_to) {
      conditions.push(`EXISTS (
        SELECT 1 FROM conversation_agents ca2
        WHERE ca2.conversation_id = c.id
          AND ca2.agent_id = $${i++}
          AND ca2.role = 'primary'
      )`); params.push(assigned_to);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    return query(`
      SELECT c.*,
        u.name  AS user_name,
        u.email AS user_email,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.message_type = 'text') AS message_count,
        (SELECT jsonb_agg(ct.tag) FROM conversation_tags ct WHERE ct.conversation_id = c.id) AS tags,
        (SELECT row_to_json(a) FROM agents a
          INNER JOIN conversation_agents ca ON ca.agent_id = a.id AND ca.role = 'primary'
          WHERE ca.conversation_id = c.id LIMIT 1) AS primary_agent,
        (SELECT MAX(m.created_at) FROM messages m WHERE m.conversation_id = c.id) AS last_message_at
      FROM conversations c
      JOIN users u ON u.id = c.user_id
      ${where}
      ORDER BY c.updated_at DESC
      LIMIT $${i++} OFFSET $${i++}
    `, params);
  },

  count: ({ status, priority, assigned_to }) => {
    const conditions = [];
    const params = [];
    let i = 1;
    if (status)      { conditions.push(`status = $${i++}`);    params.push(status); }
    if (priority)    { conditions.push(`priority = $${i++}`);  params.push(priority); }
    if (assigned_to === 'unassigned') {
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM conversation_agents ca
        WHERE ca.conversation_id = id AND ca.role = 'primary'
      )`);
    } else if (assigned_to) {
      conditions.push(`EXISTS (
        SELECT 1 FROM conversation_agents ca
        WHERE ca.conversation_id = id
          AND ca.agent_id = $${i++}
          AND ca.role = 'primary'
      )`); params.push(assigned_to);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return query(`SELECT COUNT(*) FROM conversations ${where}`, params);
  },

  findById: (id) => query(`
    SELECT c.*,
      u.name  AS user_name,
      u.email AS user_email,
      (SELECT jsonb_agg(ct.tag) FROM conversation_tags ct WHERE ct.conversation_id = c.id) AS tags,
      (SELECT jsonb_agg(row_to_json(ag)) FROM (
        SELECT a.*, ca.role FROM agents a
        JOIN conversation_agents ca ON ca.agent_id = a.id
        WHERE ca.conversation_id = c.id
      ) ag) AS agents
    FROM conversations c
    JOIN users u ON u.id = c.user_id
    WHERE c.id = $1
  `, [id]),

  create: ({ user_id, subject, priority }) => query(
    `INSERT INTO conversations (user_id, subject, priority) VALUES ($1, $2, $3) RETURNING *`,
    [user_id, subject, priority ?? 'medium']
  ),

  updateStatus: (id, status, snoozed_until = null) => query(
    `UPDATE conversations SET status = $1, snoozed_until = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
    [status, snoozed_until, id]
  ),

  updatePriority: (id, priority) => query(
    `UPDATE conversations SET priority = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [priority, id]
  ),

  addAgent: (conversation_id, agent_id, role) => query(
    `INSERT INTO conversation_agents (conversation_id, agent_id, role) VALUES ($1, $2, $3)
     ON CONFLICT (conversation_id, agent_id) DO UPDATE SET role = EXCLUDED.role
     RETURNING *`,
    [conversation_id, agent_id, role]
  ),

  removeAgent: (conversation_id, agent_id) => query(
    `DELETE FROM conversation_agents WHERE conversation_id = $1 AND agent_id = $2`,
    [conversation_id, agent_id]
  ),

  getAgents: (conversation_id) => query(
    `SELECT a.*, ca.role FROM agents a
     JOIN conversation_agents ca ON ca.agent_id = a.id
     WHERE ca.conversation_id = $1`,
    [conversation_id]
  ),

  addTag: (conversation_id, tag) => query(
    `INSERT INTO conversation_tags (conversation_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *`,
    [conversation_id, tag]
  ),

  getTags: (conversation_id) => query(
    `SELECT tag FROM conversation_tags WHERE conversation_id = $1`,
    [conversation_id]
  ),

  removeTag: (conversation_id, tag) => query(
    `DELETE FROM conversation_tags WHERE conversation_id = $1 AND tag = $2`,
    [conversation_id, tag]
  ),

  getMessageCount: (conversation_id) => query(
    `SELECT COUNT(*) FROM messages WHERE conversation_id = $1 AND message_type = 'text' AND sender_type = 'user'`,
    [conversation_id]
  ),

  updateSentiment: (conversation_id, { sentiment, score, coaching }) => query(
    `UPDATE conversations
     SET sentiment              = $1,
         sentiment_score        = $2,
         sentiment_coaching     = $3,
         sentiment_updated_at   = NOW(),
         updated_at             = NOW()
     WHERE id = $4
     RETURNING id, sentiment, sentiment_score, sentiment_coaching, sentiment_updated_at`,
    [sentiment, score, coaching, conversation_id]
  ),
};
