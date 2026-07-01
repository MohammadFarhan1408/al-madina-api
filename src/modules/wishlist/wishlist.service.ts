import { wishlistRepository } from './wishlist.repository';
import { productsRepository } from '../products/products.repository';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';

export const wishlistService = {
  /** GET /wishlist → { productIds } (§10). */
  async list(userId: string): Promise<{ productIds: string[] }> {
    const productIds = await wishlistRepository.productIdsForUser(userId);
    return { productIds };
  },

  /** POST /wishlist — add a product (idempotent guard via unique index). */
  async add(userId: string, productId: string): Promise<{ productId: string }> {
    if (!(await productsRepository.exists(productId))) {
      throw ApiError.notFound('Product not found', ERROR_CODES.PRODUCT_NOT_FOUND);
    }
    if (await wishlistRepository.exists(userId, productId)) {
      throw ApiError.conflict('Product already in wishlist', ERROR_CODES.ALREADY_IN_WISHLIST);
    }
    await wishlistRepository.add(userId, productId);
    return { productId };
  },

  /** DELETE /wishlist/:productId. */
  async remove(userId: string, productId: string): Promise<void> {
    const removed = await wishlistRepository.remove(userId, productId);
    if (!removed) {
      throw ApiError.notFound('Product not in wishlist', ERROR_CODES.NOT_IN_WISHLIST);
    }
  },
};
