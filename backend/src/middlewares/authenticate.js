/**
 * Reads the cp_session cookie from the request, looks it up in user_sessions,
 * and attaches req.user if valid. Does NOT reject unauthenticated requests —
 * individual routes decide whether to require auth.
 */
import { authService, COOKIE_NAME } from '../services/auth.service.js';
import { parseCookie } from '../utils/parseCookie.js';

export const authenticate = async (req, _res, next) => {
  try {
    const token = parseCookie(req, COOKIE_NAME);
    req.user       = token ? await authService.getSession(token) : null;
    req.sessionToken = token;
  } catch {
    req.user = null;
  }
  next();
};

export const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, error: { message: 'Not authenticated' } });
  next();
};
