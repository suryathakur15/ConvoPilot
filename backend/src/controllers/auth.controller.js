import { authService, COOKIE_NAME, COOKIE_OPTIONS } from '../services/auth.service.js';

const setCookie = (res, token) =>
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

const clearCookie = (res) =>
  res.clearCookie(COOKIE_NAME, { path: '/' });

export const authController = {
  signup: async (req, res, next) => {
    try {
      const { name, email, password } = req.body;
      if (!name?.trim() || !email?.trim() || !password) {
        return res.status(400).json({ success: false, error: { message: 'name, email and password are required' } });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid email address' } });
      }
      if (password.length < 6) {
        return res.status(400).json({ success: false, error: { message: 'Password must be at least 6 characters' } });
      }
      const { user, token } = await authService.signup({ name: name.trim(), email: email.trim().toLowerCase(), password });
      setCookie(res, token);
      res.status(201).json({ success: true, data: user });
    } catch (err) { next(err); }
  },

  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email?.trim() || !password) {
        return res.status(400).json({ success: false, error: { message: 'email and password are required' } });
      }
      const { user, token } = await authService.login({ email: email.trim().toLowerCase(), password });
      setCookie(res, token);
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  },

  logout: async (req, res, next) => {
    try {
      await authService.logout(req.sessionToken);
      clearCookie(res);
      res.json({ success: true });
    } catch (err) { next(err); }
  },

  me: async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: { message: 'Not authenticated' } });
    res.json({ success: true, data: req.user });
  },
};
