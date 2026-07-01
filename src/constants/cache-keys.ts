/**
 * Redis cache key templates and TTLs (§19 Caching).
 * Keys are produced by functions so callers cannot typo a raw string, and
 * invalidation can target stable prefixes.
 */
export const CACHE_TTL = {
  CATEGORIES: 24 * 60 * 60, // 24h
  COLLECTIONS: 24 * 60 * 60, // 24h
  PRODUCT_RAILS: 60 * 60, // 1h (featured, best-sellers, etc.)
  PRODUCT_DETAIL: 30 * 60, // 30min
  SEARCH: 5 * 60, // 5min
} as const;

export const CACHE_KEYS = {
  categories: () => 'categories:all',
  collections: () => 'collections:all',
  productRail: (rail: string) => `products:rail:${rail}`,
  productDetail: (id: string) => `products:detail:${id}`,
  search: (query: string, page: number, limit: number) =>
    `products:search:${query.toLowerCase()}:${page}:${limit}`,

  // Prefixes for pattern-based invalidation
  PREFIX: {
    products: 'products:*',
    productRails: 'products:rail:*',
    productDetail: (id: string) => `products:detail:${id}`,
    search: 'products:search:*',
    categories: 'categories:*',
    collections: 'collections:*',
  },
} as const;
