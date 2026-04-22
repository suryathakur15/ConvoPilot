import conversationRoutes from './conversation.routes.js';
import { conversationMessageRouter, messageRouter } from './message.routes.js';
import agentRoutes from './agent.routes.js';
import userRoutes from './user.routes.js';
import aiRoutes from './ai.routes.js';
import analyticsRoutes from './analytics.routes.js';
import authRoutes from './auth.routes.js';
import agentAuthRoutes from './agentAuth.routes.js';
import { authenticate } from '../middlewares/authenticate.js';

export const registerRoutes = (app) => {
  // Auth middleware runs on every request — attaches req.user if cookie is valid
  app.use(authenticate);

  app.use('/api/auth',          authRoutes);
  app.use('/api/agent-auth',    agentAuthRoutes);
  app.use('/api/conversations', conversationRoutes);
  app.use('/api/conversations/:conversationId/messages', conversationMessageRouter);
  app.use('/api/messages',      messageRouter);
  app.use('/api/agents',        agentRoutes);
  app.use('/api/users',         userRoutes);
  app.use('/api/ai',            aiRoutes);
  app.use('/api/analytics',     analyticsRoutes);
};
