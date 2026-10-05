import { adminRepository } from './admin.repository';
import { productsRepository } from '../products/products.repository';
import { productsService } from '../products/products.service';
import { categoriesRepository } from '../categories/categories.repository';
import { categoriesService } from '../categories/categories.service';
import { collectionsRepository } from '../collections/collections.repository';
import { collectionsService } from '../collections/collections.service';
import { ordersRepository } from '../orders/orders.repository';
import { ordersService } from '../orders/orders.service';
import { paymentsService } from '../payments/payments.service';
import { notificationsRepository } from '../notifications/notifications.repository';
import { addressesRepository } from '../addresses/addresses.repository';
import { User, Cart, UserPreference } from '../../database/models';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';
import { uploadToCloudinary, type UploadType } from '../../storage/upload';
import { queuePush } from '../../jobs/queues/push.queue';
import { slugify } from '../../utils/slugify';
import { Types } from 'mongoose';
import type { UserTier, OrderStatus, PaymentStatus, NotificationKind } from '../../constants/business';
import type { IProduct, ICategory, ICollection } from '../../database/models';

/** Dashboard buckets are calendar days/months in the business's timezone. */
const DASHBOARD_TZ = 'Asia/Dubai';

const dayKey = (d: Date): string => new Intl.DateTimeFormat('en-CA', { timeZone: DASHBOARD_TZ }).format(d);

/** Every bucket key from `from` to `to`, so a quiet day shows as 0 not a gap. */
export function bucketKeys(from: Date, to: Date, granularity: 'day' | 'month'): string[] {
  const [y, m, d] = dayKey(from).split('-').map(Number);
  const end = dayKey(to);
  const keys: string[] = [];
  if (granularity === 'day') {
    for (let t = Date.UTC(y, m - 1, d); ; t += 24 * 60 * 60 * 1000) {
      const k = new Date(t).toISOString().slice(0, 10);
      keys.push(k);
      if (k >= end) break;
    }
  } else {
    for (let i = 0; ; i++) {
      const k = new Date(Date.UTC(y, m - 1 + i, 1)).toISOString().slice(0, 7);
      keys.push(k);
      if (k >= end.slice(0, 7)) break;
    }
  }
  return keys;
}

export const adminService = {
  // ─── Products ──────────────────────────────────────────────────────────────
  async createProduct(data: Partial<IProduct>): Promise<IProduct> {
    if (!(await categoriesRepository.exists(String(data.categoryId)))) {
      throw ApiError.badRequest('Category does not exist', ERROR_CODES.CATEGORY_NOT_FOUND);
    }
    if (!data.slug && data.name) data.slug = slugify(data.name);
    const product = await productsRepository.create(data);
    await productsService.invalidateAll();
    await categoriesService.invalidateCache(); // category product counts
    return product;
  },

  async updateProduct(id: string, data: Partial<IProduct>): Promise<IProduct> {
    const product = await productsRepository.update(id, data);
    if (!product) throw ApiError.notFound('Product not found', ERROR_CODES.PRODUCT_NOT_FOUND);
    await productsService.invalidateProduct(id);
    if (data.categoryId) await categoriesService.invalidateCache();
    // Back-in-stock alert for anyone who wishlisted this product (§15).
    if (data.inStock === true) {
      void queuePush({ type: 'back-in-stock', productId: id, productName: product.name });
    }
    return product;
  },

  async deleteProduct(id: string): Promise<void> {
    const product = await productsRepository.softDelete(id);
    if (!product) throw ApiError.notFound('Product not found', ERROR_CODES.PRODUCT_NOT_FOUND);
    await productsService.invalidateAll();
    await categoriesService.invalidateCache();
  },

  async addProductImages(id: string, files: Express.Multer.File[]): Promise<IProduct> {
    const uploads = await Promise.all(files.map((f) => uploadToCloudinary(f, 'product')));
    const product = await productsRepository.pushImages(id, uploads.map((u) => u.url));
    if (!product) throw ApiError.notFound('Product not found', ERROR_CODES.PRODUCT_NOT_FOUND);
    await productsService.invalidateProduct(id);
    return product;
  },

  // ─── Categories ──────────────────────────────────────────────────────────────
  async createCategory(data: Partial<ICategory>): Promise<ICategory> {
    if (!data.slug && data.name) data.slug = slugify(data.name);
    const category = await categoriesRepository.create(data);
    await categoriesService.invalidateCache();
    return category;
  },

  async updateCategory(id: string, data: Partial<ICategory>): Promise<ICategory> {
    const category = await categoriesRepository.update(id, data);
    if (!category) throw ApiError.notFound('Category not found', ERROR_CODES.CATEGORY_NOT_FOUND);
    await categoriesService.invalidateCache();
    return category;
  },

  async deleteCategory(id: string): Promise<void> {
    const category = await categoriesRepository.remove(id);
    if (!category) throw ApiError.notFound('Category not found', ERROR_CODES.CATEGORY_NOT_FOUND);
    await categoriesService.invalidateCache();
  },

  // ─── Collections ───────────────────────────────────────────────────────────────
  async createCollection(data: Partial<ICollection>): Promise<ICollection> {
    if (!data.slug && data.title) data.slug = slugify(data.title);
    const collection = await collectionsRepository.create({
      ...data,
      productCount: data.productIds?.length ?? 0,
    });
    await collectionsService.invalidateCache();
    return collection;
  },

  async updateCollection(id: string, data: Partial<ICollection>): Promise<ICollection> {
    const collection = await collectionsRepository.update(id, data);
    if (!collection) throw ApiError.notFound('Collection not found', ERROR_CODES.COLLECTION_NOT_FOUND);
    await collectionsService.invalidateCache();
    return collection;
  },

  async deleteCollection(id: string): Promise<void> {
    const collection = await collectionsRepository.remove(id);
    if (!collection) throw ApiError.notFound('Collection not found', ERROR_CODES.COLLECTION_NOT_FOUND);
    await collectionsService.invalidateCache();
  },

  async addCollectionProduct(id: string, productId: string): Promise<ICollection> {
    if (!(await productsRepository.exists(productId))) {
      throw ApiError.notFound('Product not found', ERROR_CODES.PRODUCT_NOT_FOUND);
    }
    const collection = await collectionsRepository.addProduct(id, productId);
    if (!collection) throw ApiError.notFound('Collection not found', ERROR_CODES.COLLECTION_NOT_FOUND);
    await collectionsService.invalidateCache();
    return collection;
  },

  async removeCollectionProduct(id: string, productId: string): Promise<ICollection> {
    const collection = await collectionsRepository.removeProduct(id, productId);
    if (!collection) throw ApiError.notFound('Collection not found', ERROR_CODES.COLLECTION_NOT_FOUND);
    await collectionsService.invalidateCache();
    return collection;
  },

  // ─── Orders ────────────────────────────────────────────────────────────────────
  listOrders(query: {
    page: number;
    limit: number;
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    q?: string;
    from?: Date;
    to?: Date;
    sortBy?: 'reference' | 'placedAt' | 'total' | 'status';
    sortOrder?: 'asc' | 'desc';
  }) {
    return ordersRepository.listAll(query.page, query.limit, {
      status: query.status,
      paymentStatus: query.paymentStatus,
      q: query.q,
      from: query.from,
      to: query.to,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  },

  /** Order plus its customer (name/email), for the admin detail page. */
  async getOrder(id: string) {
    const order = await ordersRepository.findById(id);
    if (!order) throw ApiError.notFound('Order not found', ERROR_CODES.ORDER_NOT_FOUND);
    const customer = order.userId
      ? await User.findById(order.userId).select('fullName email avatar').lean().exec()
      : null;
    return {
      ...order.toJSON(),
      customer: customer ? { id: String(customer._id), fullName: customer.fullName, email: customer.email } : null,
    };
  },

  async updateOrderStatus(id: string, status: OrderStatus, actorId?: string) {
    // Delegates to ordersService.updateStatus, which also notifies the customer
    // (email on shipped, in-app notification, push) — see orders.service.ts.
    return ordersService.updateStatus(id, status, actorId);
  },

  orderTransactions(orderId: string) {
    return paymentsService.listForOrder(orderId);
  },

  refundPayment(transactionId: string) {
    return paymentsService.refund(transactionId);
  },

  async orderStats() {
    const [byStatus, allTime] = await Promise.all([
      adminRepository.ordersByStatus(),
      adminRepository.revenueSince(),
    ]);
    return { byStatus, totalRevenue: allTime.revenue, totalOrders: allTime.orders };
  },

  // ─── Customers ───────────────────────────────────────────────────────────────
  async listUsers(
    page: number,
    limit: number,
    tier?: UserTier,
    sortBy?: 'fullName' | 'email' | 'tier' | 'memberSince',
    sortOrder?: 'asc' | 'desc',
    q?: string,
  ) {
    const result = await adminRepository.listUsers(page, limit, tier, sortBy, sortOrder, q);
    const stats = await adminRepository.orderStatsByUser(result.items.map((u) => u._id));
    const none = { orderCount: 0, totalSpent: 0 };
    return { ...result, items: result.items.map((u) => ({ ...u, ...(stats.get(String(u._id)) ?? none) })) };
  },

  async getUser(id: string) {
    const user = await adminRepository.findUserById(id);
    if (!user) throw ApiError.notFound('User not found', ERROR_CODES.USER_NOT_FOUND);
    const [orders, addresses, cart] = await Promise.all([
      ordersRepository.listByUser(id, 1, 20),
      addressesRepository.listForUserAdmin(id),
      Cart.findOne({ userId: id }).populate('items.productId').lean().exec(),
    ]);
    const stats = (await adminRepository.orderStatsByUser([user._id])).get(id) ?? { orderCount: 0, totalSpent: 0 };
    return { user, stats, recentOrders: orders.items, addresses, cart: cart?.items ?? [] };
  },

  async updateUserTier(id: string, tier: UserTier) {
    const user = await adminRepository.updateTier(id, tier);
    if (!user) throw ApiError.notFound('User not found', ERROR_CODES.USER_NOT_FOUND);
    return user;
  },

  async reactivateUser(id: string): Promise<void> {
    const user = await adminRepository.reactivate(id);
    if (!user) throw ApiError.notFound('User not found', ERROR_CODES.USER_NOT_FOUND);
  },

  async deactivateUser(id: string): Promise<void> {
    const user = await adminRepository.deactivate(id);
    if (!user) throw ApiError.notFound('User not found', ERROR_CODES.USER_NOT_FOUND);
  },

  // ─── Notifications broadcast ─────────────────────────────────────────────────
  async broadcast(input: { kind: NotificationKind; title: string; body: string; tier?: UserTier }) {
    const filter: Record<string, unknown> = { isActive: true };
    if (input.tier) filter.tier = input.tier;
    let users = await User.find(filter).select('_id').lean<{ _id: Types.ObjectId }[]>().exec();

    // A 'promo' broadcast respects promosEnabled; other kinds (order/system/
    // wishlist) aren't promotional and always reach everyone matched above.
    if (input.kind === 'promo' && users.length > 0) {
      const optedOut = await UserPreference.find({
        userId: { $in: users.map((u) => u._id) },
        promosEnabled: false,
      })
        .select('userId')
        .lean<{ userId: Types.ObjectId }[]>()
        .exec();
      const optedOutIds = new Set(optedOut.map((p) => p.userId.toString()));
      users = users.filter((u) => !optedOutIds.has(u._id.toString()));
    }

    const docs = users.map((u) => ({
      userId: u._id,
      kind: input.kind,
      title: input.title,
      body: input.body,
    }));
    if (docs.length > 0) await notificationsRepository.insertMany(docs);
    void queuePush({ type: 'promo-broadcast', tier: input.tier, title: input.title, body: input.body });
    return { recipients: docs.length };
  },

  notificationHistory(page: number, limit: number) {
    return adminRepository.listBroadcasts(page, limit);
  },

  // ─── Upload ──────────────────────────────────────────────────────────────────
  uploadImage(file: Express.Multer.File, type: UploadType) {
    return uploadToCloudinary(file, type);
  },

  // ─── Contact submissions ─────────────────────────────────────────────────────
  listContactSubmissions(page: number, limit: number) {
    return adminRepository.listContactSubmissions(page, limit);
  },

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  /** Date-ranged dashboard: time series, totals, previous-period comparison,
   *  status breakdown and top products. Every figure comes from orders/users. */
  async dashboardSummary(range: { from: Date; to: Date; granularity: 'day' | 'month' }) {
    const { from, to, granularity } = range;
    const span = to.getTime() - from.getTime();
    const [agg, previous, topProducts] = await Promise.all([
      adminRepository.summaryAggregates(from, to, granularity, DASHBOARD_TZ),
      adminRepository.rangeTotals(new Date(from.getTime() - span), from),
      adminRepository.topProducts(5, { from, to }),
    ]);

    const sales = new Map(agg.sales.map((r) => [r._id, r]));
    const signups = new Map(agg.signups.map((r) => [r._id, r.count]));
    const series = bucketKeys(from, to, granularity).map((date) => ({
      date,
      revenue: sales.get(date)?.revenue ?? 0,
      orders: sales.get(date)?.orders ?? 0,
      newCustomers: signups.get(date) ?? 0,
    }));

    const sum = (f: (p: (typeof series)[number]) => number) => series.reduce((a, p) => a + f(p), 0);
    const revenue = sum((p) => p.revenue);
    const orders = sum((p) => p.orders);
    const aov = (r: number, o: number) => (o ? Math.round(r / o) : 0);

    return {
      range: { from, to, granularity },
      totals: { revenue, orders, aov: aov(revenue, orders), newCustomers: sum((p) => p.newCustomers) },
      previous: { ...previous, aov: aov(previous.revenue, previous.orders) },
      series,
      ordersByStatus: Object.fromEntries(agg.statuses.map((r) => [r._id, r.count])),
      topProducts,
    };
  },

  async dashboard() {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const [today, week, month, byStatus, totalProducts, outOfStock, customers, recentOrders, topProducts] =
      await Promise.all([
        adminRepository.revenueSince(new Date(now - dayMs)),
        adminRepository.revenueSince(new Date(now - 7 * dayMs)),
        adminRepository.revenueSince(new Date(now - 30 * dayMs)),
        adminRepository.ordersByStatus(),
        productsRepository.countAll(),
        productsRepository.countOutOfStock(),
        adminRepository.countUsers(),
        adminRepository.recentOrders(10),
        adminRepository.topProducts(5),
      ]);

    return {
      revenue: { today: today.revenue, week: week.revenue, month: month.revenue },
      orders: { today: today.orders, week: week.orders, month: month.orders, byStatus },
      products: { total: totalProducts, outOfStock },
      customers,
      recentOrders,
      topProducts,
    };
  },
};
