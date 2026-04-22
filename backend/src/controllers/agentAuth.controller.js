import { agentAuthService, AGENT_COOKIE_NAME, AGENT_COOKIE_OPTIONS } from '../services/agentAuth.service.js';
import { parseCookie } from '../utils/parseCookie.js';

const setCookie   = (res, token) => res.cookie(AGENT_COOKIE_NAME, token, AGENT_COOKIE_OPTIONS);
const clearCookie = (res)        => res.clearCookie(AGENT_COOKIE_NAME, { path: '/' });

export const agentAuthController = {
  signup: async (req, res, next) => {
    try {
      const { name, email, password, max_conversations } = req.body;
      if (!name?.trim() || !email?.trim() || !password) {
        return res.status(400).json({ success: false, error: { message: 'name, email and password are required' } });
      }
      if (password.length < 6) {
        return res.status(400).json({ success: false, error: { message: 'Password must be at least 6 characters' } });
      }
      const { agent, token } = await agentAuthService.signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        max_conversations: max_conversations ? parseInt(max_conversations, 10) : 10,
      });
      setCookie(res, token);
      res.status(201).json({ success: true, data: agent });
    } catch (err) { next(err); }
  },

  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email?.trim() || !password) {
        return res.status(400).json({ success: false, error: { message: 'email and password are required' } });
      }
      const { agent, token } = await agentAuthService.login({
        email: email.trim().toLowerCase(), password,
      });
      setCookie(res, token);
      res.json({ success: true, data: agent });
    } catch (err) { next(err); }
  },

  logout: async (req, res, next) => {
    try {
      const token = parseCookie(req, AGENT_COOKIE_NAME);
      await agentAuthService.logout(token);
      clearCookie(res);
      res.json({ success: true });
    } catch (err) { next(err); }
  },

  me: async (req, res, next) => {
    try {
      const token = parseCookie(req, AGENT_COOKIE_NAME);
      const agent = await agentAuthService.getSession(token);
      if (!agent) return res.status(401).json({ success: false, error: { message: 'Not authenticated' } });
      res.json({ success: true, data: agent });
    } catch (err) { next(err); }
  },
};
