import 'dotenv/config';
import http from 'http';
import { createApp } from './app.js';
import { testConnection } from './config/db.js';
import { connectRedis } from './config/redis.js';
import { initSocket } from './sockets/index.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const start = async () => {
  await testConnection();
  await connectRedis();

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.server.port, () => {
    logger.info(`ConvoPilot backend running on port ${env.server.port} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason: String(reason) });
  });
};

start().catch((err) => {
  // Log the full error — not just message — so nothing is silently swallowed
  console.error('Failed to start server:', err?.message || err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
