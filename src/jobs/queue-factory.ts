import { Queue, type JobsOptions, type ConnectionOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../config';
import { redisOptions } from '../config/redis';
import { logger } from '../config/logger';

/**
 * Dedicated Redis connection for BullMQ (separate from the cache client, which
 * is configured to fail fast). Created lazily so importing a queue module never
 * forces a connection in environments without Redis (e.g. unit tests).
 */
let connection: Redis | null = null;
function getConnection(): Redis {
  if (!connection) {
    connection = new Redis(config.redis.url, redisOptions);
    connection.on('error', (err) => logger.warn({ err }, 'BullMQ Redis connection error'));
  }
  return connection;
}

const queues = new Map<string, Queue>();

/** Get (or lazily create) a named queue. */
export function getQueue(name: string): Queue {
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, {
      // BullMQ ships its own ioredis types; cast the shared instance across.
      connection: getConnection() as unknown as ConnectionOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    });
    queues.set(name, queue);
  }
  return queue;
}

/**
 * Enqueue a job without ever blocking or breaking the caller. Background work is
 * best-effort: if Redis is unavailable the failure is logged and swallowed so
 * the originating request still succeeds.
 */
export async function enqueue<T>(
  queueName: string,
  jobName: string,
  data: T,
  opts?: JobsOptions,
): Promise<void> {
  try {
    await getQueue(queueName).add(jobName, data, opts);
  } catch (err) {
    logger.warn({ err, queueName, jobName }, 'Failed to enqueue background job');
  }
}

/** Close all queues + the shared connection (graceful shutdown). */
export async function closeQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((q) => q.close()));
  queues.clear();
  if (connection) {
    await connection.quit();
    connection = null;
  }
}

export const QUEUE_NAMES = {
  EMAIL: 'email',
  PUSH: 'push',
  NOTIFICATION: 'notification',
} as const;
