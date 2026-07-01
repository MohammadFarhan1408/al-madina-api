import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ApiError } from '../utils/api-error';
import { isZodError } from '../utils/is-zod-error';
import { ERROR_CODES } from '../constants/error-codes';
import { config } from '../config';
import { logger } from '../config/logger';
import type { ApiErrorResponse } from '../types/api.types';

/**
 * 404 handler for unmatched routes. Registered after all route definitions.
 */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Centralised error handler. Translates every thrown error into the standard
 * error envelope (§10), maps known framework errors to appropriate statuses,
 * and never leaks stack traces or internal messages in production.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let status = 500;
  let message = 'Internal server error';
  let code: string = ERROR_CODES.INTERNAL_ERROR;
  let details: Record<string, unknown> | undefined;

  if (err instanceof ApiError) {
    status = err.status;
    message = err.message;
    code = err.code;
    details = err.details;
  } else if (isZodError(err)) {
    status = 422;
    message = 'Validation failed';
    code = ERROR_CODES.VALIDATION_ERROR;
    details = { issues: err.flatten().fieldErrors };
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = 'Database validation failed';
    code = ERROR_CODES.VALIDATION_ERROR;
    details = { fields: Object.keys(err.errors) };
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid value for "${err.path}"`;
    code = ERROR_CODES.BAD_REQUEST;
  } else if (isDuplicateKeyError(err)) {
    status = 409;
    message = 'Resource already exists';
    code = ERROR_CODES.BAD_REQUEST;
    details = { keys: Object.keys((err as DuplicateKeyError).keyValue ?? {}) };
  }

  // Log server errors with full context; client errors at debug level.
  if (status >= 500) {
    logger.error({ err, path: req.originalUrl, method: req.method }, message);
  } else {
    logger.debug({ code, status, path: req.originalUrl }, message);
  }

  const body: ApiErrorResponse = {
    status,
    message: status >= 500 && config.isProd ? 'Internal server error' : message,
    code,
    ...(details ? { details } : {}),
  };

  res.status(status).json(body);
};

interface DuplicateKeyError extends Error {
  code: number;
  keyValue?: Record<string, unknown>;
}

function isDuplicateKeyError(err: unknown): err is DuplicateKeyError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === 11000
  );
}
