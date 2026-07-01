import { z } from 'zod';
import { Types } from 'mongoose';
import { PAGINATION } from '../constants/business';

/** Reusable page/limit query schema with spec-compliant clamping. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .optional()
    .default(PAGINATION.DEFAULT_LIMIT),
});

/** Validates a path param is a well-formed Mongo ObjectId. */
export const objectIdParam = (key = 'id') =>
  z.object({
    [key]: z.string().refine((v) => Types.ObjectId.isValid(v), {
      message: 'Invalid id',
    }),
  });

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
