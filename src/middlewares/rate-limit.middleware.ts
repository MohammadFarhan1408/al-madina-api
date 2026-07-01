import rateLimit, { type Options } from 'express-rate-limit';
import type { Request } from 'express';
import { ERROR_CODES } from '../constants/error-codes';
import type { ApiErrorResponse } from '../types/api.types';

/**
 * Factory producing a limiter that emits the standard error envelope on 429
 * (§18 Rate Limiting). `keyByUser` keys per authenticated user when available,
 * falling back to IP — used for per-user limits like POST /orders.
 */
function createLimiter(options: Partial<Options> & { keyByUser?: boolean }) {
  const { keyByUser, ...rest } = options;
  const body: ApiErrorResponse = {
    status: 429,
    message: 'Too many requests, please try again later',
    code: ERROR_CODES.RATE_LIMITED,
  };
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    message: body,
    ...(keyByUser
      ? { keyGenerator: (req: Request) => req.user?.id ?? req.ip ?? 'unknown' }
      : {}),
    ...rest,
  });
}

/** Global fallback limiter applied to the whole API. */
export const globalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 300,
});

// Per-spec limits (§18 Rate Limiting).
export const signInLimiter = createLimiter({ windowMs: 15 * 60 * 1000, limit: 5 });
export const signUpLimiter = createLimiter({ windowMs: 60 * 60 * 1000, limit: 10 });
export const forgotPasswordLimiter = createLimiter({ windowMs: 60 * 60 * 1000, limit: 3 });
export const searchLimiter = createLimiter({ windowMs: 60 * 1000, limit: 60 });
export const ordersLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  keyByUser: true,
});
export const contactLimiter = createLimiter({ windowMs: 60 * 60 * 1000, limit: 3 });
