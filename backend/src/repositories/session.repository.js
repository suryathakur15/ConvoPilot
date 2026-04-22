import { query } from '../config/db.js';

export const sessionRepository = {
  create: (user_id, token, expires_at) => query(
    `INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *`,
    [user_id, token, expires_at]
  ),

  findByToken: (token) => query(
    `SELECT s.*, u.id AS uid, u.name, u.email, u.metadata
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token]
  ),

  deleteByToken: (token) => query(
    `DELETE FROM user_sessions WHERE token = $1`,
    [token]
  ),

  deleteExpired: () => query(
    `DELETE FROM user_sessions WHERE expires_at <= NOW()`
  ),
};
