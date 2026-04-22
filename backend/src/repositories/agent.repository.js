import { query } from '../config/db.js';

export const agentRepository = {
  findAll: () => query(`SELECT * FROM agents ORDER BY name`),

  findById: (id) => query(`SELECT * FROM agents WHERE id = $1`, [id]),

  findOnlineWithLoad: () => query(`
    SELECT a.*, COUNT(ca.id) AS active_count
    FROM agents a
    LEFT JOIN conversation_agents ca ON ca.agent_id = a.id
    LEFT JOIN conversations c ON c.id = ca.conversation_id AND c.status = 'open'
    WHERE a.status = 'online'
    GROUP BY a.id
    ORDER BY active_count ASC, a.name ASC
  `),

  updateStatus: (id, status) => query(
    `UPDATE agents SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  ),

  create: ({ name, email, status, max_conversations }) => query(
    `INSERT INTO agents (name, email, status, max_conversations) VALUES ($1,$2,$3,$4) RETURNING *`,
    [name, email, status ?? 'offline', max_conversations ?? 10]
  ),
};
