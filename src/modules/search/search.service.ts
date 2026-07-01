import { productsRepository } from '../products/products.repository';
import { cacheWrap } from '../../utils/cache';
import { CACHE_KEYS, CACHE_TTL } from '../../constants/cache-keys';
import { TRENDING_SEARCH_TERMS } from '../../constants/business';
import type { SearchProductsQuery, SuggestQuery } from '../products/products.schema';

export const searchService = {
  /** Full-text product search, cached 5min per unique query+page (§19). */
  search(query: SearchProductsQuery) {
    return cacheWrap(
      CACHE_KEYS.search(query.q, query.page, query.limit),
      CACHE_TTL.SEARCH,
      () => productsRepository.search(query.q, query.page, query.limit),
    );
  },

  /** Prefix autocomplete (product name suggestions). */
  suggest(query: SuggestQuery): Promise<string[]> {
    return productsRepository.suggest(query.q, query.limit);
  },

  /** Hardcoded trending terms (§16 — v1). */
  trending(): readonly string[] {
    return TRENDING_SEARCH_TERMS;
  },
};
