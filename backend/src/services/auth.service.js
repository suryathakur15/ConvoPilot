import crypto from 'crypto';
import { query } from '../config/db.js';
import { sessionRepository } from '../repositories/session.repository.js';

// ── Password helpers (PBKDF2, no extra deps) ──────────────────────────────────
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

// ── Auth service ──────────────────────────────────────────────────────────────
export const authService = {
  signup: async ({ name, email, password }) => {
    // Check if email already taken
    const { rows: existing } = await query(
      `SELECT id, password_hash FROM users WHERE email = $1`,
      [email]
    );

    let user;
    if (existing[0]) {
      // Email exists — allow signup only if it has no password yet (seed user)
      if (existing[0].password_hash) {
        throw Object.assign(new Error('Email already registered'), { status: 409 });
      }
      // Upgrade seed user with a password
      const { rows } = await query(
        `UPDATE users SET name = $1, password_hash = $2, updated_at = NOW()
         WHERE id = $3 RETURNING id, name, email, metadata, created_at`,
        [name, hashPassword(password), existing[0].id]
      );
      user = rows[0];
    } else {
      const { rows } = await query(
        `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
         RETURNING id, name, email, metadata, created_at`,
        [name, email, hashPassword(password)]
      );
      user = rows[0];
    }

    return authService._createSession(user);
  },

  login: async ({ email, password }) => {
    const { rows } = await query(
      `SELECT id, name, email, metadata, created_at, password_hash FROM users WHERE email = $1`,
      [email]
    );
    const user = rows[0];
    if (!user || !user.password_hash) {
      throw Object.assign(new Error('Invalid email or password'), { status: 401 });
    }
    if (!verifyPassword(password, user.password_hash)) {
      throw Object.assign(new Error('Invalid email or password'), { status: 401 });
    }
    const { password_hash, ...safeUser } = user;
    return authService._createSession(safeUser);
  },

  logout: async (token) => {
    if (token) await sessionRepository.deleteByToken(token);
  },

  getSession: async (token) => {
    if (!token) return null;
    const { rows } = await sessionRepository.findByToken(token);
    if (!rows[0]) return null;
    const { uid, name, email, metadata, token: _t, ...rest } = rows[0];
    return { id: uid, name, email, metadata };
  },

  _createSession: async (user) => {
    const token      = generateToken();
    const expires_at = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
    await sessionRepository.create(user.id, token, expires_at);
    return { user, token, expires_at };
  },
};

export const COOKIE_NAME    = 'cp_session';
export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure:   false,     // set to true behind HTTPS in prod
  maxAge:   SESSION_TTL_DAYS * 86_400_000,
  path:     '/',
};
