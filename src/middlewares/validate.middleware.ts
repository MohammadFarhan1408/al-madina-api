import type { RequestHandler } from 'express';
import { type ZodTypeAny } from 'zod';
import { ApiError } from '../utils/api-error';
import { isZodError } from '../utils/is-zod-error';

export interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validate request parts against Zod schemas. On success the parsed (and
 * coerced/defaulted) values replace the originals so controllers consume typed,
 * trusted input. On failure a 422 VALIDATION_ERROR is produced with field-level
 * details (§18 Validation).
 *
 * Note: `req.query` and `req.params` are reassigned property-by-property because
 * Express 5 exposes them as getter-only; we mutate in place to stay compatible.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query) as Record<string, unknown>;
        Object.keys(req.query).forEach((k) => delete (req.query as Record<string, unknown>)[k]);
        Object.assign(req.query, parsed);
      }
      if (schemas.params) {
        const parsed = schemas.params.parse(req.params) as Record<string, unknown>;
        Object.assign(req.params, parsed);
      }
      next();
    } catch (err) {
      if (isZodError(err)) {
        next(ApiError.unprocessable('Validation failed', { issues: err.flatten().fieldErrors }));
        return;
      }
      next(err);
    }
  };
}
