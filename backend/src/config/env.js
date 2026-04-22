import 'dotenv/config';

const required = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
};

const optional = (key, fallback) => process.env[key] ?? fallback;

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  isDev: optional('NODE_ENV', 'development') === 'development',

  server: {
    port: parseInt(optional('BACKEND_PORT', '4000'), 10),
    // '*' means allow all origins (useful in dev / Docker when accessing from mobile/private IP).
    // In production set CORS_ORIGINS to a comma-separated list of exact origins.
    corsOrigins: (() => {
      const raw = optional('CORS_ORIGINS', '*');
      return raw === '*' ? true : raw.split(',').map((o) => o.trim());
    })(),
  },

  db: {
    host: optional('POSTGRES_HOST', 'localhost'),
    port: parseInt(optional('POSTGRES_PORT', '5432'), 10),
    user: optional('POSTGRES_USER', 'convopilot'),
    password: optional('POSTGRES_PASSWORD', 'convopilot_secret'),
    database: optional('POSTGRES_DB', 'convopilot'),
    poolMin: parseInt(optional('POSTGRES_POOL_MIN', '2'), 10),
    poolMax: parseInt(optional('POSTGRES_POOL_MAX', '10'), 10),
  },

  redis: {
    host: optional('REDIS_HOST', 'localhost'),
    port: parseInt(optional('REDIS_PORT', '6379'), 10),
    password: optional('REDIS_PASSWORD', ''),
  },

  rateLimit: {
    windowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '60000'), 10),
    max: parseInt(optional('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
  },

  ai: {
    serviceUrl: optional('AI_SERVICE_URL', 'http://localhost:8000'),
    maxContextMessages: parseInt(optional('AI_MAX_CONTEXT_MESSAGES', '20'), 10),
  },
};
