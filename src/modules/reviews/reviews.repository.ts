import { Types } from 'mongoose';
import { Review, Product, type IReview } from '../../database/models';
import { paginate } from '../../utils/paginate';
import type { Paginated } from '../../types/api.types';

export const reviewsRepository = {
  listByProduct(productId: string, page: number, limit: number): Promise<Paginated<IReview>> {
    return paginate<IReview>(
      Review,
      { productId: new Types.ObjectId(productId), deletedAt: null },
      { page, limit, sort: { date: -1 } },
    );
  },

  create(data: {
    productId: string;
    userId?: string | null;
    author: string;
    avatar?: string;
    rating: number;
    title: string;
    body: string;
    verified?: boolean;
  }): Promise<IReview> {
    return Review.create({
      productId: new Types.ObjectId(data.productId),
      userId: data.userId ? new Types.ObjectId(data.userId) : null,
      author: data.author,
      avatar: data.avatar,
      rating: data.rating,
      title: data.title,
      body: data.body,
      verified: data.verified ?? false,
    });
  },

  /**
   * Recompute a product's denormalised rating + reviewCount from its live
   * (non-deleted) reviews. Called after a review is created or removed.
   */
  async recomputeProductRating(productId: string): Promise<void> {
    const pid = new Types.ObjectId(productId);
    const [agg] = await Review.aggregate<{ avg: number; count: number }>([
      { $match: { productId: pid, deletedAt: null } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    await Product.updateOne(
      { _id: pid },
      {
        $set: {
          rating: agg ? Math.round(agg.avg * 100) / 100 : 0,
          reviewCount: agg ? agg.count : 0,
        },
      },
    ).exec();
  },

  // ─── Admin ─────────────────────────────────────────────────────────────────

  listAll(
    page: number,
    limit: number,
    rating?: number,
    sortBy: 'rating' | 'date' = 'date',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<Paginated<IReview>> {
    const filter: Record<string, unknown> = { deletedAt: null };
    if (rating) filter.rating = rating;
    const field = sortBy === 'rating' ? 'rating' : 'date';
    return paginate<IReview>(Review, filter, { page, limit, sort: { [field]: sortOrder === 'asc' ? 1 : -1 } });
  },

  async softDelete(id: string): Promise<IReview | null> {
    return Review.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true },
    ).exec();
  },

  findById(id: string): Promise<IReview | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return Review.findById(id).exec();
  },
};
