import { redis } from '../config/redis';
import { logger } from '../config/logger';

/**
 * Cache helpers over the shared Redis client. All failures are swallowed and
 * logged — caching is a performance optimisation and must never break a request
 * if Redis is briefly unavailable.
 */

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    logger.warn({ err, key }, 'Cache read failed');
    return null;
  }
}

export async function setCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn({ err, key }, 'Cache write failed');
  }
}

export async function delCache(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (err) {
    logger.warn({ err, keys }, 'Cache delete failed');
  }
}

/**
 * Delete all keys matching a glob pattern (e.g. "products:*"). Uses SCAN to
 * avoid blocking Redis with KEYS on large datasets.
 */
export async function delCacheByPattern(pattern: string): Promise<void> {
  try {
    let cursor = '0';
    do {
      const [next, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      if (batch.length > 0) {
        await redis.del(...batch);
      }
    } while (cursor !== '0');
  } catch (err) {
    logger.warn({ err, pattern }, 'Cache pattern delete failed');
  }
}

/**
 * Cache-aside helper: return the cached value if present, otherwise run the
 * loader, cache its result, and return it.
 */
export async function cacheWrap<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = await getCache<T>(key);
  if (cached !== null) {
    logger.debug({ key }, 'Cache HIT');
    return cached;
  }
  logger.debug({ key }, 'Cache MISS');
  const value = await loader();
  await setCache(key, value, ttlSeconds);
  return value;
}
