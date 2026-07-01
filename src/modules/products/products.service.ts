import { productsRepository } from './products.repository';
import { reviewsRepository } from '../reviews/reviews.repository';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';
import { cacheWrap, delCacheByPattern, delCache } from '../../utils/cache';
import { CACHE_KEYS, CACHE_TTL } from '../../constants/cache-keys';
import type { ListProductsQuery } from './products.schema';
import type { IProduct } from '../../database/models';
import type { Paginated } from '../../types/api.types';
import type { PaginationQuery } from '../../utils/common.schema';

/** Flag → cache-rail name mapping for the home sections. */
const RAIL_FLAGS = {
  featured: 'isFeatured',
  'new-arrivals': 'isNewArrival',
  'best-sellers': 'isBestSeller',
  signature: 'isSignature',
  seasonal: 'isSeasonal',
} as const;

export type RailName = keyof typeof RAIL_FLAGS;

export const productsService = {
  /** GET /products — list or, if `ids` present, bulk fetch by id. */
  async list(query: ListProductsQuery): Promise<Paginated<IProduct> | IProduct[]> {
    if (query.ids) {
      const ids = query.ids.split(',').map((s) => s.trim()).filter(Boolean);
      return productsRepository.findByIds(ids);
    }
    return productsRepository.list(query);
  },

  /** GET /products/:id — cached 30min (§19). */
  async getById(id: string): Promise<IProduct> {
    const product = await cacheWrap(CACHE_KEYS.productDetail(id), CACHE_TTL.PRODUCT_DETAIL, () =>
      productsRepository.findById(id),
    );
    if (!product) {
      throw ApiError.notFound('Product not found', ERROR_CODES.PRODUCT_NOT_FOUND);
    }
    return product;
  },

  /** Home rail — cached 1h. */
  rail(name: RailName): Promise<IProduct[]> {
    return cacheWrap(CACHE_KEYS.productRail(name), CACHE_TTL.PRODUCT_RAILS, () =>
      productsRepository.findByFlag(RAIL_FLAGS[name]),
    );
  },

  /** GET /products/:id/reviews (paginated). */
  async reviews(productId: string, query: PaginationQuery) {
    if (!(await productsRepository.exists(productId))) {
      throw ApiError.notFound('Product not found', ERROR_CODES.PRODUCT_NOT_FOUND);
    }
    return reviewsRepository.listByProduct(productId, query.page, query.limit);
  },

  /** Invalidate caches touching a single product (admin update/delete). */
  async invalidateProduct(id: string): Promise<void> {
    await Promise.all([
      delCache(CACHE_KEYS.productDetail(id)),
      delCacheByPattern(CACHE_KEYS.PREFIX.productRails),
      delCacheByPattern(CACHE_KEYS.PREFIX.search),
    ]);
  },

  /** Invalidate all product caches (admin create / bulk ops). */
  async invalidateAll(): Promise<void> {
    await delCacheByPattern(CACHE_KEYS.PREFIX.products);
  },
};
