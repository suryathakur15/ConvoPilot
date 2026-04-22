import { query } from '../config/db.js';

export const userRepository = {
  findAll: ({ limit, offset }) => query(
    `SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  ),

  count: () => query(`SELECT COUNT(*) FROM users`),

  findById: (id) => query(`SELECT * FROM users WHERE id = $1`, [id]),

  findByEmail: (email) => query(`SELECT * FROM users WHERE email = $1`, [email]),

  create: ({ name, email }) => query(
    `INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *`,
    [name, email]
  ),

  upsert: ({ name, email }) => query(
    `INSERT INTO users (name, email) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
     RETURNING *`,
    [name, email]
  ),
};
