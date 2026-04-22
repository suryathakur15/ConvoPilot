import { query } from '../config/db.js';

export const messageRepository = {
  findByConversation: ({ conversation_id, limit, offset, include_notes = true }) => {
    const typeFilter = include_notes ? '' : `AND m.message_type = 'text'`;
    return query(`
      SELECT m.*,
        CASE
          WHEN m.sender_type = 'agent' THEN (SELECT name FROM agents WHERE id = m.sender_id)
          WHEN m.sender_type = 'user'  THEN (SELECT name FROM users  WHERE id = m.sender_id)
          ELSE 'Bot'
        END AS sender_name,
        CASE WHEN m.parent_message_id IS NOT NULL THEN
          (SELECT row_to_json(p) FROM (
            SELECT id, content, sender_type FROM messages WHERE id = m.parent_message_id
          ) p)
        END AS parent_message
      FROM messages m
      WHERE m.conversation_id = $1 ${typeFilter}
      ORDER BY m.created_at ASC
      LIMIT $2 OFFSET $3
    `, [conversation_id, limit, offset]);
  },

  count: (conversation_id) =>
    query(`SELECT COUNT(*) FROM messages WHERE conversation_id = $1`, [conversation_id]),

  create: ({ conversation_id, sender_type, sender_id, content, message_type, parent_message_id }) =>
    query(
      `INSERT INTO messages (conversation_id, sender_type, sender_id, content, message_type, parent_message_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [conversation_id, sender_type, sender_id, content, message_type ?? 'text', parent_message_id ?? null]
    ),

  findById: (id) =>
    query(`SELECT * FROM messages WHERE id = $1`, [id]),

  getContextMessages: (conversation_id, limit) =>
    query(
      `SELECT sender_type, content FROM messages
       WHERE conversation_id = $1 AND message_type = 'text'
       ORDER BY created_at DESC LIMIT $2`,
      [conversation_id, limit]
    ),
};
