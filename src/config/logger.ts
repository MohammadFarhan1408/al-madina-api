import pino from 'pino';
import { config } from './index';

/**
 * Structured application logger.
 *
 * - Development: pretty-printed, colorized output via pino-pretty.
 * - Production: raw JSON (ingestible by log aggregators).
 * - Sensitive fields are redacted regardless of environment.
 */
export const logger = pino({
  level: config.logLevel,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      '*.password',
      '*.passwordHash',
      'token',
      'accessToken',
      'refreshToken',
    ],
    censor: '[REDACTED]',
  },
  transport: config.isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
});

export type Logger = typeof logger;
