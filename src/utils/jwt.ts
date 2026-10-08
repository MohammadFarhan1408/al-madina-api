import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { ApiError } from './api-error';
import { ERROR_CODES } from '../constants/error-codes';
import type { AccessTokenPayload } from '../types/api.types';

type AccessClaims = Omit<AccessTokenPayload, 'iat' | 'exp'>;

/**
 * Sign a short-lived (15m) access token. The refresh token itself is an opaque
 * random string (see hash.ts) stored hashed in the DB, so only the access token
 * is a JWT here.
 */
export function signAccessToken(claims: AccessClaims): string {
  return jwt.sign(claims, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiry,
    algorithm: 'HS256',
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  } as SignOptions);
}

/**
 * Verify and decode an access token. Maps expiry/invalid signature to the
 * appropriate ApiError so callers get a consistent 401.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    // Pin the algorithm and the issuer/audience so a token signed some other
    // way — or minted for another service with the same secret — is rejected.
    return jwt.verify(token, config.jwt.accessSecret, {
      algorithms: ['HS256'],
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    }) as AccessTokenPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('Access token expired', ERROR_CODES.TOKEN_EXPIRED);
    }
    throw ApiError.unauthorized('Invalid access token', ERROR_CODES.TOKEN_INVALID);
  }
}

/**
 * Compute an absolute expiry Date for a stored refresh token from the
 * configured duration string (e.g. "30d", "12h", "60m", "3600s").
 */
export function refreshTokenExpiry(now: Date = new Date()): Date {
  const ms = parseDurationMs(config.jwt.refreshExpiry);
  return new Date(now.getTime() + ms);
}

export function parseDurationMs(input: string): number {
  const match = /^(\d+)\s*([smhd])$/.exec(input.trim());
  if (!match) {
    // Fall back to 30 days if the format is unrecognised.
    return 30 * 24 * 60 * 60 * 1000;
  }
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * multipliers[unit];
}
