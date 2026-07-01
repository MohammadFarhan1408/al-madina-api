import { ZodError } from 'zod';

/**
 * Robust ZodError detection. Prefers `instanceof` but falls back to a structural
 * `name === 'ZodError'` check so validation errors are still recognised if more
 * than one Zod module instance exists in the runtime graph (e.g. a transitive
 * copy under a versioned subpath).
 */
export function isZodError(err: unknown): err is ZodError {
  return (
    err instanceof ZodError ||
    (typeof err === 'object' &&
      err !== null &&
      (err as { name?: string }).name === 'ZodError' &&
      typeof (err as { flatten?: unknown }).flatten === 'function')
  );
}
