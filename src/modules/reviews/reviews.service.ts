import { reviewsRepository } from './reviews.repository';
import { productsRepository } from '../products/products.repository';
import { ordersRepository } from '../orders/orders.repository';
import { authRepository } from '../auth/auth.repository';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';
import { stripHtml } from '../../utils/sanitize';
import { productsService } from '../products/products.service';
import type { CreateReviewInput } from './reviews.schema';
import type { AuthUser } from '../../types/api.types';
import type { IReview } from '../../database/models';

/** "Layla Ahmed" -> "Layla A." — full first name, last-initial, for a public
 * review byline (keeps the account's full name off the product page). */
function displayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export const reviewsService = {
  /**
   * Create a review for a product. The author's name/avatar come from the
   * authenticated user; `verified` is set when the user has a delivered order
   * containing the product. One live review per user per product — a repeat
   * submission is rejected rather than letting one account move the rating
   * arbitrarily (enforced here and by a partial unique index as a backstop).
   * Triggers a rating recompute (§19 Background Jobs — synchronous for now;
   * queued in Stage 8).
   */
  async create(productId: string, user: AuthUser, input: CreateReviewInput): Promise<IReview> {
    if (!(await productsRepository.exists(productId))) {
      throw ApiError.notFound('Product not found', ERROR_CODES.PRODUCT_NOT_FOUND);
    }
    if (await reviewsRepository.existsForUser(productId, user.id)) {
      throw ApiError.conflict('You have already reviewed this product', ERROR_CODES.REVIEW_ALREADY_EXISTS);
    }

    const [verified, author] = await Promise.all([
      ordersRepository.userHasPurchased(user.id, productId),
      authRepository.findById(user.id),
    ]);

    const review = await reviewsRepository.create({
      productId,
      userId: user.id,
      author: author ? displayName(author.fullName) : user.email.split('@')[0],
      avatar: author?.avatar,
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

  listAll(page: number, limit: number, rating?: number, sortBy?: 'rating' | 'date', sortOrder?: 'asc' | 'desc') {
    return reviewsRepository.listAll(page, limit, rating, sortBy, sortOrder);
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
