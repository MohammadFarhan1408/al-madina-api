import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Test environment variables — set before any app module reads `config`.
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
// Placeholder so env validation passes at import time; the real connection in
// beforeAll uses the in-memory server's URI directly.
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/al-madina-test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_at_least_16_chars';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_at_least_16_chars';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.REDIS_URL = 'redis://127.0.0.1:6399'; // unreachable: cache/jobs degrade gracefully

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // Build indexes (incl. the product text index) before tests query.
  await mongoose.connection.asPromise();
});

afterEach(async () => {
  // Reset collections between tests for isolation.
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  // Close any lazily-created BullMQ queues/connection before tearing down Mongo
  // so background reconnect attempts don't log after the test run completes.
  const { closeQueues } = await import('../src/jobs/queue-factory');
  await closeQueues();
  await mongoose.disconnect();
  await mongod.stop();
});
