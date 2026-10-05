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

  /** True if this user already has a live (non-deleted) review on this product. */
  existsForUser(productId: string, userId: string): Promise<boolean> {
    return Review.exists({
      productId: new Types.ObjectId(productId),
      userId: new Types.ObjectId(userId),
      deletedAt: null,
    }).then((doc) => Boolean(doc));
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

  /** Admin list; each review also carries `productName` so a moderator can
   *  tell what is being reviewed. */
  async listAll(
    page: number,
    limit: number,
    rating?: number,
    sortBy: 'rating' | 'date' = 'date',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<Paginated<IReview & { productName?: string }>> {
    const filter: Record<string, unknown> = { deletedAt: null };
    if (rating) filter.rating = rating;
    const field = sortBy === 'rating' ? 'rating' : 'date';
    const result = await paginate<IReview>(Review, filter, {
      page,
      limit,
      sort: { [field]: sortOrder === 'asc' ? 1 : -1 },
    });
    const products = await Product.find({ _id: { $in: result.items.map((r) => r.productId) } })
      .select('name')
      .lean<{ _id: Types.ObjectId; name: string }[]>()
      .exec();
    const names = new Map(products.map((p) => [p._id.toString(), p.name]));
    return {
      ...result,
      // Lean rows are plain objects; the Document type is only nominal here.
      items: result.items.map((r) => ({ ...r, productName: names.get(String(r.productId)) })) as (IReview & {
        productName?: string;
      })[],
    };
  },

  /** Average rating and 1–5 star distribution across live reviews. */
  async summary(): Promise<{ average: number; total: number; distribution: Record<1 | 2 | 3 | 4 | 5, number> }> {
    const rows = await Review.aggregate<{ _id: number; count: number }>([
      { $match: { deletedAt: null } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]);
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    let sum = 0;
    for (const r of rows) {
      distribution[r._id as 1 | 2 | 3 | 4 | 5] = r.count;
      total += r.count;
      sum += r._id * r.count;
    }
    return { average: total ? Math.round((sum / total) * 10) / 10 : 0, total, distribution };
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
