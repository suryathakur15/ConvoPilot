import crypto from 'crypto';
import { query } from '../config/db.js';

// ── Password helpers (same PBKDF2 approach as user auth) ─────────────────────
const ITERATIONS = 100_000;
const KEY_LEN    = 64;
const DIGEST     = 'sha512';

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, stored) => {
  try {
    const [salt, hash] = stored.split(':');
    const check = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
};

const generateToken = () => crypto.randomBytes(32).toString('hex');
const SESSION_TTL_DAYS = 30;

export const agentAuthService = {
  signup: async ({ name, email, password, max_conversations = 10 }) => {
    const { rows: existing } = await query(
      `SELECT id, password_hash FROM agents WHERE email = $1`, [email]
    );

    let agent;
    if (existing[0]) {
      // Allow seed agents (no password) to claim their account
      if (existing[0].password_hash) {
        throw Object.assign(new Error('Email already registered'), { status: 409 });
      }
      const { rows } = await query(
        `UPDATE agents SET name = $1, password_hash = $2, updated_at = NOW()
         WHERE id = $3 RETURNING id, name, email, status, max_conversations`,
        [name, hashPassword(password), existing[0].id]
      );
      agent = rows[0];
    } else {
      const { rows } = await query(
        `INSERT INTO agents (name, email, password_hash, status, max_conversations)
         VALUES ($1, $2, $3, 'offline', $4)
         RETURNING id, name, email, status, max_conversations`,
        [name, email, hashPassword(password), max_conversations]
      );
      agent = rows[0];
    }

    return agentAuthService._createSession(agent);
  },

  login: async ({ email, password }) => {
    const { rows } = await query(
      `SELECT id, name, email, status, max_conversations, password_hash FROM agents WHERE email = $1`,
      [email]
    );
    const agent = rows[0];
    if (!agent || !agent.password_hash) {
      throw Object.assign(new Error('Invalid email or password'), { status: 401 });
    }
    if (!verifyPassword(password, agent.password_hash)) {
      throw Object.assign(new Error('Invalid email or password'), { status: 401 });
    }
    const { password_hash, ...safeAgent } = agent;
    return agentAuthService._createSession(safeAgent);
  },

  logout: async (token) => {
    if (token) await query(`DELETE FROM agent_sessions WHERE token = $1`, [token]);
  },

  getSession: async (token) => {
    if (!token) return null;
    const { rows } = await query(
      `SELECT a.id, a.name, a.email, a.status, a.max_conversations
       FROM agent_sessions s
       JOIN agents a ON a.id = s.agent_id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );
    return rows[0] ?? null;
  },

  _createSession: async (agent) => {
    const token      = generateToken();
    const expires_at = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
    await query(
      `INSERT INTO agent_sessions (agent_id, token, expires_at) VALUES ($1, $2, $3)`,
      [agent.id, token, expires_at]
    );
    return { agent, token, expires_at };
  },
};

export const AGENT_COOKIE_NAME    = 'cp_agent_session';
export const AGENT_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure:   false,
  maxAge:   SESSION_TTL_DAYS * 86_400_000,
  path:     '/',
};
