import { collectionsRepository } from './collections.repository';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';
import { cacheWrap, delCacheByPattern } from '../../utils/cache';
import { CACHE_KEYS, CACHE_TTL } from '../../constants/cache-keys';
import type { ICollection, IProduct } from '../../database/models';

export const collectionsService = {
  /** All collections, cached 24h (§19). */
  list(): Promise<ICollection[]> {
    return cacheWrap(CACHE_KEYS.collections(), CACHE_TTL.COLLECTIONS, () =>
      collectionsRepository.findAll(),
    );
  },

  /** Products within a collection (curated order). */
  async products(collectionId: string): Promise<IProduct[]> {
    const collection = await collectionsRepository.findById(collectionId);
    if (!collection) {
      throw ApiError.notFound('Collection not found', ERROR_CODES.COLLECTION_NOT_FOUND);
    }
    return collectionsRepository.productsFor(collection);
  },

  async invalidateCache(): Promise<void> {
    await delCacheByPattern(CACHE_KEYS.PREFIX.collections);
  },
};
