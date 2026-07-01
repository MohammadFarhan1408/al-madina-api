import { reviewsRepository } from './reviews.repository';
import { productsRepository } from '../products/products.repository';
import { ordersRepository } from '../orders/orders.repository';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';
import { stripHtml } from '../../utils/sanitize';
import { productsService } from '../products/products.service';
import type { CreateReviewInput } from './reviews.schema';
import type { AuthUser } from '../../types/api.types';
import type { IReview } from '../../database/models';

export const reviewsService = {
  /**
   * Create a review for a product. The author's name/avatar come from the
   * authenticated user; `verified` is set when the user has a delivered order
   * containing the product. Triggers a rating recompute (§19 Background Jobs —
   * synchronous for now; queued in Stage 8).
   */
  async create(productId: string, user: AuthUser, input: CreateReviewInput): Promise<IReview> {
    if (!(await productsRepository.exists(productId))) {
      throw ApiError.notFound('Product not found', ERROR_CODES.PRODUCT_NOT_FOUND);
    }

    const verified = await ordersRepository.userHasPurchased(user.id, productId);

    const review = await reviewsRepository.create({
      productId,
      userId: user.id,
      author: user.email.split('@')[0],
      rating: input.rating,
      title: stripHtml(input.title),
      body: stripHtml(input.body),
      verified,
    });

    await reviewsRepository.recomputeProductRating(productId);
    await productsService.invalidateProduct(productId);

    return review;
  },

  // ─── Admin ─────────────────────────────────────────────────────────────────

  listAll(page: number, limit: number, rating?: number) {
    return reviewsRepository.listAll(page, limit, rating);
  },

  async remove(id: string): Promise<void> {
    const review = await reviewsRepository.softDelete(id);
    if (!review) {
      throw ApiError.notFound('Review not found', ERROR_CODES.REVIEW_NOT_FOUND);
    }
    await reviewsRepository.recomputeProductRating(review.productId.toString());
    await productsService.invalidateProduct(review.productId.toString());
  },
};
