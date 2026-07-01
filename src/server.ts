import type { Server } from 'http';
import { createApp } from './app';
import { config } from './config';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { disconnectRedis } from './config/redis';
import { startWorkers, stopWorkers } from './jobs';
import { closeQueues } from './jobs/queue-factory';

let server: Server | undefined;

async function bootstrap(): Promise<void> {
  // Fail fast if core infrastructure is unreachable.
  await connectDatabase();

  const app = createApp();

  // Start background workers (email, push, notification).
  startWorkers();

  server = app.listen(config.port, () => {
    logger.info(`🚀 Al Madina API listening on port ${config.port} [${config.env}]`);
  });
}

/**
 * Graceful shutdown: stop accepting connections, then close DB and Redis.
 * A hard timeout guards against hanging connections preventing exit.
 */
async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received — shutting down gracefully`);

  const forceExit = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => (err ? reject(err) : resolve()));
      });
      logger.info('HTTP server closed');
    }
    await stopWorkers();
    await closeQueues();
    await disconnectDatabase();
    await disconnectRedis();
    clearTimeout(forceExit);
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
}

(['SIGTERM', 'SIGINT'] as const).forEach((signal) => {
  process.on(signal, () => void shutdown(signal));
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — exiting');
  process.exit(1);
});

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
