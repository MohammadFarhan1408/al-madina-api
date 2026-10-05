import { Types, type FilterQuery } from 'mongoose';
import { Order, type IOrder, type IOrderItem, type IShippingAddress } from '../../database/models';
import { paginate } from '../../utils/paginate';
import { escapeRegex } from '../../utils/escape-regex';
import type { Paginated } from '../../types/api.types';
import type { OrderStatus, DeliveryMethod, PaymentMethod, PaymentStatus } from '../../constants/business';

export interface CreateOrderData {
  reference: string;
  userId?: string | null;
  guestEmail?: string;
  shippingAddress: IShippingAddress;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  items: IOrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  couponCode?: string;
  discountAmount?: number;
  idempotencyKey?: string;
}

export const ordersRepository = {
  create(data: CreateOrderData): Promise<IOrder> {
    return Order.create({
      ...data,
      userId: data.userId ? new Types.ObjectId(data.userId) : null,
      statusHistory: [{ status: 'processing', at: new Date() }],
    });
  },

  listByUser(userId: string, page: number, limit: number, status?: OrderStatus): Promise<Paginated<IOrder>> {
    const filter: FilterQuery<IOrder> = { userId: new Types.ObjectId(userId), deletedAt: null };
    if (status) filter.status = status;
    return paginate<IOrder>(Order, filter, { page, limit, sort: { placedAt: -1 } });
  },

  findById(id: string): Promise<IOrder | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return Order.findOne({ _id: id, deletedAt: null }).exec();
  },

  findByIdempotencyKey(idempotencyKey: string): Promise<IOrder | null> {
    return Order.findOne({ idempotencyKey, deletedAt: null }).exec();
  },

  updatePaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<IOrder | null> {
    return Order.findByIdAndUpdate(id, { $set: { paymentStatus } }, { new: true }).exec();
  },

  /** True if the user has a delivered order containing the given product. */
  async userHasPurchased(userId: string, productId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(productId)) return false;
    const doc = await Order.exists({
      userId: new Types.ObjectId(userId),
      'items.productId': new Types.ObjectId(productId),
      status: 'delivered',
    });
    return Boolean(doc);
  },

  // ─── Admin ─────────────────────────────────────────────────────────────────

  listAll(
    page: number,
    limit: number,
    filters: {
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      /** Matches reference, guest email or the shipping name. */
      q?: string;
      from?: Date;
      to?: Date;
      sortBy?: 'reference' | 'placedAt' | 'total' | 'status';
      sortOrder?: 'asc' | 'desc';
    } = {},
  ): Promise<Paginated<IOrder>> {
    const filter: FilterQuery<IOrder> = { deletedAt: null };
    if (filters.status) filter.status = filters.status;
    if (filters.paymentStatus) filter.paymentStatus = filters.paymentStatus;
    if (filters.q) {
      const re = new RegExp(escapeRegex(filters.q), 'i');

      filter.$or = [{ reference: re }, { guestEmail: re }, { 'shippingAddress.fullName': re }];
    }
    if (filters.from || filters.to) {
      filter.placedAt = {};
      if (filters.from) filter.placedAt.$gte = filters.from;
      if (filters.to) filter.placedAt.$lte = filters.to;
    }
    const sortBy = filters.sortBy ?? 'placedAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    return paginate<IOrder>(Order, filter, { page, limit, sort: { [sortBy]: sortOrder } });
  },

  updateStatus(id: string, status: OrderStatus, actorId?: string): Promise<IOrder | null> {
    const by = actorId && Types.ObjectId.isValid(actorId) ? new Types.ObjectId(actorId) : null;
    return Order.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { status }, $push: { statusHistory: { status, at: new Date(), by } } },
      { new: true },
    ).exec();
  },
};
