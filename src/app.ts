import express, { type Application, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { pinoHttp } from 'pino-http';
import { config } from './config';
import { logger } from './config/logger';
import { sendSuccess } from './utils/api-response';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import swaggerUi from 'swagger-ui-express';
import { globalLimiter } from './middlewares/rate-limit.middleware';
import { apiRouter } from './routes';
import { openApiSpec } from './docs/swagger';

/**
 * Build and configure the Express application. Kept separate from the HTTP
 * server (server.ts) so it can be imported directly by integration tests.
 */
export function createApp(): Application {
  const app = express();

  // Trust the first proxy hop (needed for correct client IPs behind a load
  // balancer — required for rate limiting and audit logging).
  app.set('trust proxy', 1);

  // ─── Security & parsing ──────────────────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // ─── Logging ─────────────────────────────────────────────────────────────
  app.use(pinoHttp({ logger }));
  if (config.isDev) {
    app.use(morgan('dev'));
  }

  // ─── Health check ────────────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    sendSuccess(res, {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      env: config.env,
    });
  });

  // ─── API documentation ────────────────────────────────────────────────────
  app.get('/docs.json', (_req: Request, res: Response) => {
    res.json(openApiSpec);
  });
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, { customSiteTitle: 'Al Madina API' }));

  // ─── API routes ──────────────────────────────────────────────────────────
  app.use('/v1', globalLimiter, apiRouter);

  // ─── 404 + error handling (must be last) ─────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
