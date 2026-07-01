import { categoriesRepository } from './categories.repository';
import { productsRepository } from '../products/products.repository';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';
import { cacheWrap, delCacheByPattern } from '../../utils/cache';
import { CACHE_KEYS, CACHE_TTL } from '../../constants/cache-keys';
import type { ICategory } from '../../database/models';
import type { PaginationQuery } from '../../utils/common.schema';

export const categoriesService = {
  /** All categories, cached 24h (§19). */
  list(): Promise<ICategory[]> {
    return cacheWrap(CACHE_KEYS.categories(), CACHE_TTL.CATEGORIES, () =>
      categoriesRepository.findAll(),
    );
  },

  /** Products within a category (paginated). */
  async products(categoryId: string, query: PaginationQuery) {
    if (!(await categoriesRepository.exists(categoryId))) {
      throw ApiError.notFound('Category not found', ERROR_CODES.CATEGORY_NOT_FOUND);
    }
    return productsRepository.list({ categoryId, page: query.page, limit: query.limit });
  },

  /** Invalidate the categories cache (called by admin writes). */
  async invalidateCache(): Promise<void> {
    await delCacheByPattern(CACHE_KEYS.PREFIX.categories);
  },
};
