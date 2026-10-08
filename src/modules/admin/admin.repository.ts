import { Types } from 'mongoose';
import {
  User,
  Order,
  Product,
  AuditLog,
  ContactSubmission,
  type IUser,
  type IContactSubmission,
} from '../../database/models';
import { paginate } from '../../utils/paginate';
import { escapeRegex } from '../../utils/escape-regex';
import type { Paginated } from '../../types/api.types';
import type { UserTier, NotificationKind } from '../../constants/business';

export interface ActivityEntry {
  id: string;
  actorEmail?: string;
  method: string;
  path: string;
  statusCode?: number;
  ip?: string;
  createdAt: Date;
}

export interface BroadcastHistoryEntry {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  tier?: UserTier;
  actorEmail?: string;
  createdAt: Date;
}

export const adminRepository = {
  // ─── Customers ───────────────────────────────────────────────────────────────
  listUsers(
    page: number,
    limit: number,
    tier?: UserTier,
    sortBy: 'fullName' | 'email' | 'tier' | 'memberSince' = 'memberSince',
    sortOrder: 'asc' | 'desc' = 'desc',
    q?: string,
  ): Promise<Paginated<IUser>> {
    const filter: Record<string, unknown> = {};
    if (tier) filter.tier = tier;
    if (q) {
      const regex = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ fullName: regex }, { email: regex }];
    }
    return paginate<IUser>(User, filter, { page, limit, sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } });
  },

  findUserById(id: string): Promise<IUser | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return User.findById(id).exec();
  },

  /** Non-cancelled order count and spend per customer — one grouped query. */
  async orderStatsByUser(ids: Types.ObjectId[]): Promise<Map<string, { orderCount: number; totalSpent: number }>> {
    const rows = await Order.aggregate<{ _id: Types.ObjectId; orderCount: number; totalSpent: number }>([
      { $match: { userId: { $in: ids }, deletedAt: null, status: { $ne: 'cancelled' } } },
      { $group: { _id: '$userId', orderCount: { $sum: 1 }, totalSpent: { $sum: '$total' } } },
    ]);
    return new Map(rows.map((r) => [r._id.toString(), { orderCount: r.orderCount, totalSpent: r.totalSpent }]));
  },

  updateTier(id: string, tier: UserTier): Promise<IUser | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return User.findByIdAndUpdate(id, { $set: { tier } }, { new: true }).exec();
  },

  deactivate(id: string): Promise<IUser | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return User.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true }).exec();
  },

  reactivate(id: string): Promise<IUser | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return User.findByIdAndUpdate(id, { $set: { isActive: true } }, { new: true }).exec();
  },

  countUsers(): Promise<number> {
    return User.countDocuments({ isActive: true }).exec();
  },

  // ─── Notifications broadcast history ────────────────────────────────────────
  // Broadcasts aren't stored as their own record (a broadcast fans out into N
  // per-recipient Notification docs with no shared id) — reuse the audit trail
  // that already records every admin mutation, now that it captures req.body.
  async listBroadcasts(page: number, limit: number): Promise<Paginated<BroadcastHistoryEntry>> {
    const filter = { method: 'POST', path: '/v1/admin/notifications' };
    const result = await paginate<{
      _id: Types.ObjectId;
      actorEmail?: string;
      createdAt: Date;
      metadata?: { body?: { kind: NotificationKind; title: string; body: string; tier?: UserTier } };
    }>(AuditLog, filter, { page, limit, sort: { createdAt: -1 } });

    return {
      ...result,
      items: result.items.map((log) => ({
        id: log._id.toString(),
        kind: log.metadata?.body?.kind ?? 'system',
        title: log.metadata?.body?.title ?? '',
        body: log.metadata?.body?.body ?? '',
        tier: log.metadata?.body?.tier,
        actorEmail: log.actorEmail,
        createdAt: log.createdAt,
      })),
    };
  },

  // ─── Activity log ────────────────────────────────────────────────────────────
  /** Admin mutations from the audit trail, newest first. The request body is
   *  deliberately not returned: it can hold customer data, and the list only
   *  needs who did what, where and when. */
  async listActivity(
    page: number,
    limit: number,
    filters: { q?: string; method?: string; from?: Date; to?: Date },
  ): Promise<Paginated<ActivityEntry>> {
    const filter: Record<string, unknown> = {};
    if (filters.method) filter.method = filters.method;
    if (filters.q) {
      const re = new RegExp(escapeRegex(filters.q), 'i');
      filter.$or = [{ actorEmail: re }, { path: re }];
    }
    if (filters.from || filters.to) {
      filter.createdAt = {
        ...(filters.from ? { $gte: filters.from } : {}),
        ...(filters.to ? { $lte: filters.to } : {}),
      };
    }
    const result = await paginate<{
      _id: Types.ObjectId;
      actorEmail?: string;
      method: string;
      path: string;
      statusCode?: number;
      ip?: string;
      createdAt: Date;
    }>(AuditLog, filter, { page, limit, sort: { createdAt: -1 } });
    return {
      ...result,
      items: result.items.map((l) => ({
        id: l._id.toString(),
        actorEmail: l.actorEmail,
        method: l.method,
        path: l.path,
        statusCode: l.statusCode,
        ip: l.ip,
        createdAt: l.createdAt,
      })),
    };
  },

  // ─── Contact submissions ─────────────────────────────────────────────────────
  listContactSubmissions(page: number, limit: number): Promise<Paginated<IContactSubmission>> {
    return paginate<IContactSubmission>(ContactSubmission, {}, { page, limit, sort: { createdAt: -1 } });
  },

  // ─── Global search (command palette) ────────────────────────────────────────
  /** A handful of matches per kind — enough to jump to a record, not a result page. */
  async search(q: string, limit = 5) {
    const re = new RegExp(escapeRegex(q), 'i');
    const [products, orders, customers] = await Promise.all([
      Product.find({ deletedAt: null, $or: [{ name: re }, { brand: re }] })
        .select('name brand images inStock')
        .limit(limit)
        .lean<{ _id: Types.ObjectId; name: string; brand: string; images?: string[]; inStock: boolean }[]>()
        .exec(),
      Order.find({
        deletedAt: null,
        $or: [{ reference: re }, { guestEmail: re }, { 'shippingAddress.fullName': re }],
      })
        .sort({ placedAt: -1 })
        .select('reference status total currency guestEmail shippingAddress.fullName')
        .limit(limit)
        .lean<
          {
            _id: Types.ObjectId;
            reference: string;
            status: string;
            total: number;
            currency: string;
            guestEmail?: string;
            shippingAddress?: { fullName?: string };
          }[]
        >()
        .exec(),
      User.find({ role: 'user', $or: [{ fullName: re }, { email: re }] })
        .select('fullName email isActive')
        .limit(limit)
        .lean<{ _id: Types.ObjectId; fullName: string; email: string; isActive: boolean }[]>()
        .exec(),
    ]);
    return {
      products: products.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        brand: p.brand,
        image: p.images?.[0],
        inStock: p.inStock,
      })),
      orders: orders.map((o) => ({
        id: o._id.toString(),
        reference: o.reference,
        status: o.status,
        total: o.total,
        currency: o.currency,
        customer: o.shippingAddress?.fullName ?? o.guestEmail,
      })),
      customers: customers.map((c) => ({
        id: c._id.toString(),
        fullName: c.fullName,
        email: c.email,
        isActive: c.isActive,
      })),
    };
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

  /** Top products by revenue from order line items, optionally within a date range. */
  topProducts(limit = 5, range?: { from: Date; to: Date }) {
    return Order.aggregate([
      {
        $match: {
          deletedAt: null,
          status: { $ne: 'cancelled' },
          ...(range ? { placedAt: { $gte: range.from, $lte: range.to } } : {}),
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.productName' },
          image: { $first: '$items.productImage' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          unitsSold: { $sum: '$items.quantity' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
    ]);
  },

  // ─── Dashboard summary (date-ranged) ────────────────────────────────────────

  /** Revenue + orders per bucket, order counts per status, and sign-ups per
   *  bucket for [from, to]. Buckets are calendar days/months in `tz`. */
  async summaryAggregates(from: Date, to: Date, granularity: 'day' | 'month', tz: string) {
    const format = granularity === 'month' ? '%Y-%m' : '%Y-%m-%d';
    const bucket = (field: string) => ({ $dateToString: { format, date: field, timezone: tz } });
    const placed = { deletedAt: null, placedAt: { $gte: from, $lte: to } };

    const [sales, statuses, signups] = await Promise.all([
      Order.aggregate<{ _id: string; revenue: number; orders: number }>([
        { $match: { ...placed, status: { $ne: 'cancelled' } } },
        { $group: { _id: bucket('$placedAt'), revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      ]),
      Order.aggregate<{ _id: string; count: number }>([
        { $match: placed },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      User.aggregate<{ _id: string; count: number }>([
        { $match: { role: 'user', createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: bucket('$createdAt'), count: { $sum: 1 } } },
      ]),
    ]);
    return { sales, statuses, signups };
  },

  /** Totals for one range — used for the previous-period comparison. */
  async rangeTotals(from: Date, to: Date): Promise<{ revenue: number; orders: number; newCustomers: number }> {
    const [[sales], newCustomers] = await Promise.all([
      Order.aggregate<{ revenue: number; orders: number }>([
        { $match: { deletedAt: null, status: { $ne: 'cancelled' }, placedAt: { $gte: from, $lt: to } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      ]),
      User.countDocuments({ role: 'user', createdAt: { $gte: from, $lt: to } }).exec(),
    ]);
    return { revenue: sales?.revenue ?? 0, orders: sales?.orders ?? 0, newCustomers };
  },
};
