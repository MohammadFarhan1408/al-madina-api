import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { PAGINATION } from '../constants/business';
import type { Paginated } from '../types/api.types';

export interface PaginateOptions {
  page?: number;
  limit?: number;
  sort?: Record<string, SortOrder>;
  /** Projection of fields to return (select only what's needed, §19). */
  select?: string;
  /** Paths to populate. */
  populate?: string | string[];
  /** Disable count query when a total is unnecessary (performance). */
  lean?: boolean;
}

/** Clamp page/limit to the spec's bounds (default 20, max 50, §16). */
export function normalizePagination(page?: number, limit?: number): { page: number; limit: number } {
  const safePage = Math.max(1, Math.floor(page ?? PAGINATION.DEFAULT_PAGE));
  const safeLimit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, Math.floor(limit ?? PAGINATION.DEFAULT_LIMIT)),
  );
  return { page: safePage, limit: safeLimit };
}

/**
 * Run a paginated find with a parallel count and return the standard
 * `{ items, page, pageSize, total, hasMore }` envelope (§16 Pagination).
 */
export async function paginate<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>,
  filter: FilterQuery<T>,
  options: PaginateOptions = {},
): Promise<Paginated<T>> {
  const { page, limit } = normalizePagination(options.page, options.limit);
  const skip = (page - 1) * limit;

  let query = model.find(filter).skip(skip).limit(limit);
  if (options.sort) query = query.sort(options.sort);
  if (options.select) query = query.select(options.select);
  if (options.populate) query = query.populate(options.populate);
  if (options.lean !== false) query = query.lean();

  const [items, total] = await Promise.all([
    query.exec() as Promise<T[]>,
    model.countDocuments(filter).exec(),
  ]);

  return {
    items,
    page,
    pageSize: limit,
    total,
    hasMore: skip + items.length < total,
  };
}
