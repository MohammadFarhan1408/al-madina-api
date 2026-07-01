import { Types, type FilterQuery } from 'mongoose';
import { Order, type IOrder, type IOrderItem, type IShippingAddress } from '../../database/models';
import { paginate } from '../../utils/paginate';
import type { Paginated } from '../../types/api.types';
import type { OrderStatus, DeliveryMethod, PaymentMethod } from '../../constants/business';

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
}

export const ordersRepository = {
  create(data: CreateOrderData): Promise<IOrder> {
    return Order.create({
      ...data,
      userId: data.userId ? new Types.ObjectId(data.userId) : null,
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

  findByReference(reference: string): Promise<IOrder | null> {
    return Order.findOne({ reference, deletedAt: null }).exec();
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
    filters: { status?: OrderStatus; from?: Date; to?: Date } = {},
  ): Promise<Paginated<IOrder>> {
    const filter: FilterQuery<IOrder> = { deletedAt: null };
    if (filters.status) filter.status = filters.status;
    if (filters.from || filters.to) {
      filter.placedAt = {};
      if (filters.from) filter.placedAt.$gte = filters.from;
      if (filters.to) filter.placedAt.$lte = filters.to;
    }
    return paginate<IOrder>(Order, filter, { page, limit, sort: { placedAt: -1 } });
  },

  updateStatus(id: string, status: OrderStatus): Promise<IOrder | null> {
    return Order.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { status } },
      { new: true },
    ).exec();
  },
};
