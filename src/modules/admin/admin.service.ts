import { adminRepository } from './admin.repository';
import { productsRepository } from '../products/products.repository';
import { productsService } from '../products/products.service';
import { categoriesRepository } from '../categories/categories.repository';
import { categoriesService } from '../categories/categories.service';
import { collectionsRepository } from '../collections/collections.repository';
import { collectionsService } from '../collections/collections.service';
import { ordersRepository } from '../orders/orders.repository';
import { notificationsRepository } from '../notifications/notifications.repository';
import { User } from '../../database/models';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';
import { uploadToCloudinary, type UploadType } from '../../storage/upload';
import { queuePush } from '../../jobs/queues/push.queue';
import { Types } from 'mongoose';
import type { UserTier, OrderStatus, NotificationKind } from '../../constants/business';
import type { IProduct, ICategory, ICollection } from '../../database/models';

export const adminService = {
  // ─── Products ──────────────────────────────────────────────────────────────
  async createProduct(data: Partial<IProduct>): Promise<IProduct> {
    if (!(await categoriesRepository.exists(String(data.categoryId)))) {
      throw ApiError.badRequest('Category does not exist', ERROR_CODES.CATEGORY_NOT_FOUND);
    }
    const product = await productsRepository.create(data);
    await productsService.invalidateAll();
    return product;
  },

  async updateProduct(id: string, data: Partial<IProduct>): Promise<IProduct> {
    const product = await productsRepository.update(id, data);
    if (!product) throw ApiError.notFound('Product not found', ERROR_CODES.PRODUCT_NOT_FOUND);
    await productsService.invalidateProduct(id);
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
  listOrders(query: { page: number; limit: number; status?: OrderStatus; from?: Date; to?: Date }) {
    return ordersRepository.listAll(query.page, query.limit, {
      status: query.status,
      from: query.from,
      to: query.to,
    });
  },

  async updateOrderStatus(id: string, status: OrderStatus) {
    const order = await ordersRepository.updateStatus(id, status);
    if (!order) throw ApiError.notFound('Order not found', ERROR_CODES.ORDER_NOT_FOUND);
    // TODO (Stage 8): notify the customer of the status change.
    return order;
  },

  async orderStats() {
    const [byStatus, allTime] = await Promise.all([
      adminRepository.ordersByStatus(),
      adminRepository.revenueSince(),
    ]);
    return { byStatus, totalRevenue: allTime.revenue, totalOrders: allTime.orders };
  },

  // ─── Customers ───────────────────────────────────────────────────────────────
  listUsers(page: number, limit: number, tier?: UserTier) {
    return adminRepository.listUsers(page, limit, tier);
  },

  async getUser(id: string) {
    const user = await adminRepository.findUserById(id);
    if (!user) throw ApiError.notFound('User not found', ERROR_CODES.USER_NOT_FOUND);
    const orders = await ordersRepository.listByUser(id, 1, 20);
    return { user, orders: orders.items };
  },

  async updateUserTier(id: string, tier: UserTier) {
    const user = await adminRepository.updateTier(id, tier);
    if (!user) throw ApiError.notFound('User not found', ERROR_CODES.USER_NOT_FOUND);
    return user;
  },

  async deactivateUser(id: string): Promise<void> {
    const user = await adminRepository.deactivate(id);
    if (!user) throw ApiError.notFound('User not found', ERROR_CODES.USER_NOT_FOUND);
  },

  // ─── Notifications broadcast ─────────────────────────────────────────────────
  async broadcast(input: { kind: NotificationKind; title: string; body: string; tier?: UserTier }) {
    const filter: Record<string, unknown> = { isActive: true };
    if (input.tier) filter.tier = input.tier;
    const users = await User.find(filter).select('_id').lean<{ _id: Types.ObjectId }[]>().exec();

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

  // ─── Upload ──────────────────────────────────────────────────────────────────
  uploadImage(file: Express.Multer.File, type: UploadType) {
    return uploadToCloudinary(file, type);
  },

  // ─── Dashboard ───────────────────────────────────────────────────────────────
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
