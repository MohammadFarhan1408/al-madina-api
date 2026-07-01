import { Types } from 'mongoose';
import { User, Order, type IUser } from '../../database/models';
import { paginate } from '../../utils/paginate';
import type { Paginated } from '../../types/api.types';
import type { UserTier } from '../../constants/business';

export const adminRepository = {
  // ─── Customers ───────────────────────────────────────────────────────────────
  listUsers(page: number, limit: number, tier?: UserTier): Promise<Paginated<IUser>> {
    const filter: Record<string, unknown> = {};
    if (tier) filter.tier = tier;
    return paginate<IUser>(User, filter, { page, limit, sort: { createdAt: -1 } });
  },

  findUserById(id: string): Promise<IUser | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return User.findById(id).exec();
  },

  updateTier(id: string, tier: UserTier): Promise<IUser | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return User.findByIdAndUpdate(id, { $set: { tier } }, { new: true }).exec();
  },

  deactivate(id: string): Promise<IUser | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return User.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true }).exec();
  },

  countUsers(): Promise<number> {
    return User.countDocuments({ isActive: true }).exec();
  },

  // ─── Dashboard aggregations ──────────────────────────────────────────────────

  /** Order counts grouped by status. */
  async ordersByStatus(): Promise<Record<string, number>> {
    const rows = await Order.aggregate<{ _id: string; count: number }>([
      { $match: { deletedAt: null } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(rows.map((r) => [r._id, r.count]));
  },

  /** Total revenue + order count since a given date (or all-time). */
  async revenueSince(since?: Date): Promise<{ revenue: number; orders: number }> {
    const match: Record<string, unknown> = { deletedAt: null, status: { $ne: 'cancelled' } };
    if (since) match.placedAt = { $gte: since };
    const [agg] = await Order.aggregate<{ revenue: number; orders: number }>([
      { $match: match },
      { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    ]);
    return { revenue: agg?.revenue ?? 0, orders: agg?.orders ?? 0 };
  },

  recentOrders(limit = 10) {
    return Order.find({ deletedAt: null }).sort({ placedAt: -1 }).limit(limit).lean().exec();
  },

  /** Top products by revenue from order line items. */
  topProducts(limit = 5) {
    return Order.aggregate([
      { $match: { deletedAt: null, status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.productName' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          unitsSold: { $sum: '$items.quantity' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
    ]);
  },
};
