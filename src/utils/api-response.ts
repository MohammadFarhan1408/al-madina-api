import type { Response } from 'express';
import type { ApiResponse } from '../types/api.types';
import { serialize } from './serialize';

/**
 * Send a standard success envelope: `{ data, message? }`. The payload is run
 * through `serialize` so `_id` becomes a string `id` and internal fields are
 * stripped — uniform across lean queries, Mongoose docs, and aggregations.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  status = 200,
  message?: string,
): Response {
  const payload = serialize(data) as T;
  const body: ApiResponse<T> = message ? { data: payload, message } : { data: payload };
  return res.status(status).json(body);
}

/**
 * Convenience for 201 Created responses.
 */
export function sendCreated<T>(res: Response, data: T, message?: string): Response {
  return sendSuccess(res, data, 201, message);
}
