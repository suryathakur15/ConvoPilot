import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { globalRateLimiter } from './middlewares/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { registerRoutes } from './routes/index.js';
import { logger } from './utils/logger.js';

export const createApp = () => {
  const app = express();

  // Security
  app.use(helmet());
  app.use(cors({
    origin: env.server.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));

  // Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Logging
  app.use(morgan(env.isDev ? 'dev' : 'combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));

  // Rate limiting
  app.use('/api', globalRateLimiter);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'convopilot-backend' });
  });

  // Routes
  registerRoutes(app);

  // 404 + error
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
