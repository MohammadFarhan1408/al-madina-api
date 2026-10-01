import type { RequestHandler } from 'express';
import { AuditLog } from '../database/models';
import { logger } from '../config/logger';

/** Methods that mutate state and therefore warrant an audit record. */
const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/** Body keys whose values must never be persisted. */
const SENSITIVE = /password|token|secret|otp|card|cvv/i;
const redact = (body: unknown): unknown =>
  body && typeof body === 'object' && !Array.isArray(body)
    ? Object.fromEntries(
        Object.entries(body).map(([k, v]) => [k, SENSITIVE.test(k) ? '[REDACTED]' : redact(v)]),
      )
    : body;

/**
 * Records admin/manager mutations (§18 Audit Logs). Mounted on the admin router
 * after auth, so `req.user` is always present. The record is written after the
 * response finishes so the final status code is captured; write failures are
 * logged but never block the response.
 */
export const auditLog: RequestHandler = (req, res, next) => {
  if (!MUTATING_METHODS.has(req.method)) {
    return next();
  }

  res.on('finish', () => {
    void AuditLog.create({
      actorId: req.user?.id ?? null,
      actorEmail: req.user?.email,
      action: `${req.method} ${req.baseUrl}${req.path}`,
      method: req.method,
      path: `${req.baseUrl}${req.path}`,
      ip: req.ip,
      statusCode: res.statusCode,
      metadata: { params: req.params, query: req.query, body: redact(req.body) },
    }).catch((err) => {
      logger.warn({ err }, 'Failed to write audit log');
    });
  });

  next();
};
