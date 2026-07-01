/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {}],
  },
  testTimeout: 30000,
  clearMocks: true,
  maxWorkers: 1,
  // Background Redis/BullMQ connections keep the event loop alive; close in
  // teardown but force-exit as a safety net so the runner always terminates.
  forceExit: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/server.ts'],
};
