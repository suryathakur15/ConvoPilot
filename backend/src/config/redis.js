import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const createClient = (name) => {
  const client = new Redis({
    host: env.redis.host,
    port: env.redis.port,
    password: env.redis.password || undefined,
    retryStrategy: (times) => {
      if (times > 10) {
        logger.error(`Redis (${name}) retry limit reached`);
        return null;
      }
      return Math.min(times * 100, 3000);
    },
    enableReadyCheck: true,
    lazyConnect: true,
  });

  client.on('connect', () => logger.info(`Redis (${name}) connected`));
  client.on('error', (err) => logger.error(`Redis (${name}) error`, { error: err.message }));

  return client;
};

export const redis = createClient('main');
export const redisSub = createClient('subscriber');
export const redisPub = createClient('publisher');

export const connectRedis = async () => {
  await Promise.all([redis.connect(), redisSub.connect(), redisPub.connect()]);
};
