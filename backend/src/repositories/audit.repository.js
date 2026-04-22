import { query } from '../config/db.js';

export const auditRepository = {
  log: ({ conversation_id, action, actor_type, actor_id, metadata = {} }) =>
    query(
      `INSERT INTO audit_logs (conversation_id, action, actor_type, actor_id, metadata)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [conversation_id, action, actor_type, actor_id ?? null, JSON.stringify(metadata)]
    ),

  findByConversation: (conversation_id) =>
    query(
      `SELECT * FROM audit_logs WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [conversation_id]
    ),
};
