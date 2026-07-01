import { Worker, type Processor, type ConnectionOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../config';
import { redisOptions } from '../config/redis';
import { logger } from '../config/logger';
import { QUEUE_NAMES } from './queue-factory';
import { processEmail } from './processors/email.processor';
import { processPush } from './processors/push.processor';
import { processNotification } from './processors/notification.processor';

let workers: Worker[] = [];
let workerConnection: Redis | null = null;

function createWorker(name: string, processor: Processor): Worker {
  const worker = new Worker(name, processor, {
    connection: workerConnection as unknown as ConnectionOptions,
    concurrency: 5,
  });
  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id, queue: name }, `Job failed in ${name} queue`);
  });
  worker.on('error', (err) => logger.warn({ err, queue: name }, 'Worker error'));
  return worker;
}

/**
 * Start background workers. Called from server.ts after the DB is connected.
 * Workers run in the same process here; in a larger deployment they would run
 * as separate worker dynos consuming the same Redis.
 */
export function startWorkers(): void {
  if (workers.length > 0) return;
  workerConnection = new Redis(config.redis.url, redisOptions);
  workerConnection.on('error', (err) => logger.warn({ err }, 'Worker Redis connection error'));

  workers = [
    createWorker(QUEUE_NAMES.EMAIL, processEmail as Processor),
    createWorker(QUEUE_NAMES.PUSH, processPush as Processor),
    createWorker(QUEUE_NAMES.NOTIFICATION, processNotification as Processor),
  ];
  logger.info('✅ Background workers started (email, push, notification)');
}

/** Gracefully stop all workers (called during shutdown). */
export async function stopWorkers(): Promise<void> {
  await Promise.all(workers.map((w) => w.close()));
  workers = [];
  if (workerConnection) {
    await workerConnection.quit();
    workerConnection = null;
  }
}
