import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../database/models';
import { ApiError } from '../utils/api-error';
import { ERROR_CODES } from '../constants/error-codes';
import type { UserRole } from '../constants/business';
import type { AuthUser } from '../types/api.types';

/** Extract a Bearer token from the Authorization header, if present. */
function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return null;
}

function toAuthUser(payload: ReturnType<typeof verifyAccessToken>): AuthUser {
  return {
    id: payload.sub,
    email: payload.email,
    tier: payload.tier,
    role: payload.role,
  };
}

/**
 * Require a valid access token. Attaches `req.user` or throws 401.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw ApiError.unauthorized('Authentication required', ERROR_CODES.UNAUTHORIZED);
  }
  req.user = toAuthUser(verifyAccessToken(token));
  next();
};

/**
 * Attach `req.user` if a valid token is present; otherwise continue as guest.
 * Used by endpoints that behave differently for authenticated vs guest callers
 * (e.g. POST /orders, GET /products with wishlist overlay).
 */
export const authOptional: RequestHandler = (req, _res, next) => {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = toAuthUser(verifyAccessToken(token));
    } catch {
      // Ignore invalid tokens in optional mode — treat as guest.
    }
  }
  next();
};

/**
 * Require the authenticated user to hold one of the given roles. Must run after
 * requireAuth. `admin` implicitly satisfies any role check.
 *
 * The role and active flag are re-read from the database rather than trusted
 * from the token, so a demoted or deactivated staff member loses access on their
 * next request instead of when their access token expires. One indexed lookup
 * per staff request — admin traffic is small.
 */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required', ERROR_CODES.UNAUTHORIZED);
    }
    const userId = req.user.id;
    User.findById(userId)
      .select('role isActive')
      .lean<{ role: UserRole; isActive: boolean }>()
      .exec()
      .then((current) => {
        if (!current || !current.isActive) {
          throw ApiError.unauthorized('Account no longer active', ERROR_CODES.ACCOUNT_INACTIVE);
        }
        if (req.user) req.user.role = current.role;
        if (current.role === 'admin' || roles.includes(current.role)) return next();
        throw ApiError.forbidden('Insufficient permissions', ERROR_CODES.FORBIDDEN);
      })
      .catch(next);
  };
}
