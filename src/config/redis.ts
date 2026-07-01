import { Redis, type RedisOptions } from 'ioredis';
import { config } from './index';
import { logger } from './logger';

/**
 * Shared connection options. BullMQ requires `maxRetriesPerRequest: null` on the
 * connections it uses, so we expose the options for queue/worker creation while
 * keeping a dedicated client for general caching.
 */
export const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
};

/**
 * General-purpose Redis client used by the cache utilities. Configured to fail
 * fast rather than queue commands when Redis is unavailable, so a cache call
 * never blocks a request — the cache helpers swallow the error and fall through
 * to the database. BullMQ creates its own connections from `redisOptions`.
 */
export const redis = new Redis(config.redis.url, {
  ...redisOptions,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

redis.on('connect', () => {
  logger.info('✅ Redis connected');
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  logger.info('Redis connection closed');
}
