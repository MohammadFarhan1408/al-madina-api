import mongoose from 'mongoose';
import { config } from './index';
import { logger } from './logger';

mongoose.set('strictQuery', true);

/**
 * Establish the Mongoose connection with bounded retry. The process should not
 * proceed to accept traffic until the database is reachable, so failures here
 * are surfaced to the caller (server.ts) which decides whether to exit.
 */
export async function connectDatabase(retries = 5, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await mongoose.connect(config.mongo.uri, {
        serverSelectionTimeoutMS: 10_000,
        maxPoolSize: 20,
        minPoolSize: 2,
      });
      logger.info('✅ MongoDB connected');
      return;
    } catch (err) {
      logger.error(
        { err, attempt, retries },
        `MongoDB connection failed (attempt ${attempt}/${retries})`,
      );
      if (attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
}

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error({ err }, 'MongoDB connection error');
});

export { mongoose };
