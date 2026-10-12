import type { RequestHandler } from 'express';
import { ApiError } from '../utils/api-error';
import { ERROR_CODES } from '../constants/error-codes';

const MAX_DEPTH = 20;

/** True if any key at any depth starts with `$` or contains `.` — the shapes that
 *  turn a value into a MongoDB operator or a nested-path write. */
function hasOperatorKey(value: unknown, depth = 0): boolean {
  if (depth > MAX_DEPTH) return true;
  if (Array.isArray(value)) return value.some((v) => hasOperatorKey(v, depth + 1));
  if (value === null || typeof value !== 'object' || Buffer.isBuffer(value)) return false;
  return Object.entries(value).some(
    ([key, v]) => key.startsWith('$') || key.includes('.') || hasOperatorKey(v, depth + 1),
  );
}

/**
 * Defence in depth against NoSQL operator injection (e.g. `{"email":{"$ne":null}}`
 * or `?status[$ne]=x`). Every route already validates its input with Zod, which
 * rejects these shapes; this guard makes the protection independent of each
 * route remembering to. Signed webhook bodies are raw Buffers and pass through.
 */
export const rejectOperatorKeys: RequestHandler = (req, _res, next) => {
  if (hasOperatorKey(req.body) || hasOperatorKey(req.query) || hasOperatorKey(req.params)) {
    throw ApiError.badRequest('Request contains disallowed keys', ERROR_CODES.BAD_REQUEST);
  }
  next();
};
