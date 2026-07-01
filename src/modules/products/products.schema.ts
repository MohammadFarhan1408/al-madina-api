import { z } from 'zod';
import {
  SCENT_FAMILIES,
  PRODUCT_BADGES,
  SORT_OPTIONS,
  PAGINATION,
} from '../../constants/business';

/** GET /products query (§10, §16 — filters, sort, pagination). */
export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).optional().default(PAGINATION.DEFAULT_LIMIT),
  categoryId: z.string().optional(),
  family: z.enum(SCENT_FAMILIES).optional(),
  q: z.string().trim().optional(),
  sort: z.enum(SORT_OPTIONS).optional().default('featured'),
  badge: z.enum(PRODUCT_BADGES).optional(),
  inStock: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  isFeatured: z.enum(['true', 'false']).optional().transform((v) => (v === undefined ? undefined : v === 'true')),
  isNewArrival: z.enum(['true', 'false']).optional().transform((v) => (v === undefined ? undefined : v === 'true')),
  isBestSeller: z.enum(['true', 'false']).optional().transform((v) => (v === undefined ? undefined : v === 'true')),
  isSignature: z.enum(['true', 'false']).optional().transform((v) => (v === undefined ? undefined : v === 'true')),
  isSeasonal: z.enum(['true', 'false']).optional().transform((v) => (v === undefined ? undefined : v === 'true')),
  // Comma-separated id list for wishlist hydration (GET /products?ids=).
  ids: z.string().optional(),
});

/** GET /products/search query. */
export const searchProductsQuerySchema = z.object({
  q: z.string().trim().min(1, 'Search query is required'),
  page: z.coerce.number().int().min(1).optional().default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).optional().default(PAGINATION.DEFAULT_LIMIT),
});

/** GET /products/suggest query. */
export const suggestQuerySchema = z.object({
  q: z.string().trim().min(1, 'Search query is required'),
  limit: z.coerce.number().int().min(1).max(10).optional().default(5),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type SearchProductsQuery = z.infer<typeof searchProductsQuerySchema>;
export type SuggestQuery = z.infer<typeof suggestQuerySchema>;
